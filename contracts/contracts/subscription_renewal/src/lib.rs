#![no_std]

use soroban_sdk::{
    contract,
    contractevent,
    contractimpl,
    contracttype,
    xdr::ToXdr,
    Address,
    Env,
    IntoVal,
};

#[contracttype]
#[derive(Clone)]
enum ContractKey {
    Admin,
    Paused,
    LoggingContract,
    FeeConfig,
}

#[contracttype]
#[derive(Clone)]
struct ApprovalKey {
    sub_id: u64,
    approval_id: u64,
}

#[contracttype]
#[derive(Clone)]
struct ExecutorKey {
    sub_id: u64,
}

#[contracttype]
#[derive(Clone)]
struct WindowKey {
    sub_id: u64,
}

#[contracttype]
#[derive(Clone)]
struct RenewalLockKey {
    lock_sub_id: u64,
}

#[contracttype]
#[derive(Clone)]
struct CycleKey {
    sub_id: u64,
}

#[contracttype]
#[derive(Clone)]
struct LifecycleKey {
    lifecycle_sub_id: u64,
}

// ── Data types ────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RenewalApproval {
    pub sub_id: u64,
    pub max_spend: i128,
    pub expires_at: u32,
    pub used: bool,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SubscriptionState {
    Active,
    Retrying,
    Failed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SubscriptionData {
    pub owner: Address,
    pub merchant: Address,
    pub amount: i128,
    pub frequency: u64,
    pub spending_cap: i128,
    pub integrity_hash: soroban_sdk::BytesN<32>,
    pub state: SubscriptionState,
    pub failure_count: u32,
    pub last_attempt_ledger: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LifecycleTimestamps {
    pub created_at: u64,
    pub activated_at: u64,
    pub last_renewed_at: u64,
    pub canceled_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RenewalWindow {
    pub billing_start: u64,
    pub billing_end: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RenewalLockData {
    pub locked_at: u32,
    pub lock_timeout: u32,
}

// ── Events ────────────────────────────────────────────────────────────────────

#[contractevent]
pub struct RenewalSuccess {
    pub sub_id: u64,
    pub owner: Address,
}

#[contractevent]
pub struct RenewalFailed {
    pub sub_id: u64,
    pub failure_count: u32,
    pub ledger: u32,
}

#[contractevent]
pub struct StateTransition {
    pub sub_id: u64,
    pub new_state: SubscriptionState,
}

#[contractevent]
pub struct PauseToggled {
    pub paused: bool,
}

#[contractevent]
pub struct ApprovalCreated {
    pub sub_id: u64,
    pub approval_id: u64,
    pub max_spend: i128,
    pub expires_at: u32,
}

#[contractevent]
pub struct ApprovalRejected {
    pub sub_id: u64,
    pub approval_id: u64,
    pub reason: u32,
}

#[contractevent]
pub struct ExecutorAssigned {
    pub sub_id: u64,
    pub executor: Address,
}

#[contractevent]
pub struct ExecutorRemoved {
    pub sub_id: u64,
}

#[contractevent]
pub struct WindowUpdated {
    pub sub_id: u64,
    pub billing_start: u64,
    pub billing_end: u64,
}

// ── Renewal lock types ────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
struct RenewalLockKey {
    lock_sub_id: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RenewalLockData {
    pub locked_at: u32,
    pub lock_timeout: u32,
}

#[contractevent]
pub struct RenewalLockAcquired {
    pub sub_id: u64,
    pub locked_at: u32,
    pub lock_timeout: u32,
}

#[contractevent]
pub struct RenewalLockReleased {
    pub sub_id: u64,
    pub released_at: u32,
}

#[contractevent]
pub struct RenewalLockExpired {
    pub sub_id: u64,
    pub original_locked_at: u32,
    pub expired_at: u32,
}

// ── Lifecycle types ───────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
struct LifecycleKey {
    lifecycle_sub_id: u64,
}

#[contractevent]
pub struct LifecycleTimestampUpdated {
    pub sub_id: u64,
    pub event_kind: u32,
    pub timestamp: u64,
}

// ── Renewal window types ──────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
struct WindowKey {
    sub_id: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RenewalWindow {
    pub billing_start: u64,
    pub billing_end: u64,
}

// ── Cycle dedup types ─────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
struct CycleKey {
    sub_id: u64,
}

#[contractevent]
pub struct DuplicateRenewalRejected {
    pub sub_id: u64,
    pub cycle_id: u64,
}

// ── Integrity violation event ─────────────────────────────────────

#[contractevent]
pub struct IntegrityViolation {
    pub sub_id: u64,
}

#[contractevent]
pub struct LogEmitted {
    pub sub_id: u64,
    pub event_type: u32,
}

#[contract]
pub struct SubscriptionRenewalContract;

#[contractimpl]
impl SubscriptionRenewalContract {
    // ── Admin / Pause management ──────────────────────────────────

    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&ContractKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&ContractKey::Admin, &admin);
        env.storage().instance().set(&ContractKey::Paused, &false);
    }

    fn require_admin(env: &Env) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&ContractKey::Admin)
            .expect("Contract not initialized");
        admin.require_auth();
    }

    pub fn set_paused(env: Env, paused: bool) {
        Self::require_admin(&env);
        env.storage().instance().set(&ContractKey::Paused, &paused);
        PauseToggled { paused }.publish(&env);
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&ContractKey::Paused)
            .unwrap_or(false)
    }

    /// Set the logging contract address. Admin only.
    pub fn set_logging_contract(env: Env, address: Address) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&ContractKey::LoggingContract, &address);
    }

    // ── Subscription management ───────────────────────────────────

    pub fn init_sub(
        env: Env,
        owner: Address,
        merchant: Address,
        amount: i128,
        frequency: u64,
        spending_cap: i128,
        sub_id: u64,
    ) {
        let mut integrity_data = soroban_sdk::Vec::<soroban_sdk::Val>::new(&env);
        integrity_data.push_back(merchant.into_val(&env));
        integrity_data.push_back(amount.into_val(&env));
        integrity_data.push_back(frequency.into_val(&env));
        integrity_data.push_back(spending_cap.into_val(&env));

        let integrity_hash = env.crypto().sha256(&integrity_data.to_xdr(&env));

        let key = sub_id;
        let data = SubscriptionData {
            owner,
            merchant,
            amount,
            frequency,
            spending_cap,
            integrity_hash: integrity_hash.into(),
            state: SubscriptionState::Active,
            failure_count: 0,
            last_attempt_ledger: 0,
        };
        env.storage().persistent().set(&key, &data);

        let now = env.ledger().timestamp();
        let lifecycle = LifecycleTimestamps {
            created_at: now,
            activated_at: now,
            last_renewed_at: 0,
            canceled_at: 0,
        };
        let lc_key = LifecycleKey {
            lifecycle_sub_id: sub_id,
        };
        env.storage().persistent().set(&lc_key, &lifecycle);

        LifecycleTimestampUpdated {
            sub_id,
            event_kind: 1,
            timestamp: now,
        }
        .publish(&env);
        LifecycleTimestampUpdated {
            sub_id,
            event_kind: 2,
            timestamp: now,
        }
        .publish(&env);

        Self::record_log(
            &env,
            sub_id,
            2,
            soroban_sdk::String::from_str(&env, "Subscription initialized"),
        );
    }

    fn record_log(env: &Env, sub_id: u64, event_type: u32, _data_str: soroban_sdk::String) {
        if let Some(_log_addr) = env
            .storage()
            .instance()
            .get::<_, Address>(&ContractKey::LoggingContract)
        {
            // Here we would call the logging contract.
            // Since we are in a multi-contract setup, we'd use a client.
            // For now, we'll emit an event as a placeholder or assume the client is available.
            // (In a real implementation, we'd use a cross-contract call).
            LogEmitted { sub_id, event_type }.publish(env);
        }
    }

    /// Explicitly cancel a subscription
    pub fn cancel_sub(env: Env, sub_id: u64) {
        let key = sub_id;
        let mut data: SubscriptionData = env
            .storage()
            .persistent()
            .get(&key)
            .expect("Subscription not found");

        data.owner.require_auth();

        if data.state == SubscriptionState::Cancelled {
            panic!("Subscription already cancelled");
        }

        data.state = SubscriptionState::Cancelled;
        env.storage().persistent().set(&key, &data);

        let lc_key = LifecycleKey {
            lifecycle_sub_id: sub_id,
        };
        let mut lifecycle: LifecycleTimestamps = env
            .storage()
            .persistent()
            .get(&lc_key)
            .expect("Lifecycle data not found");
        let now = env.ledger().timestamp();
        lifecycle.canceled_at = now;
        env.storage().persistent().set(&lc_key, &lifecycle);

        LifecycleTimestampUpdated {
            sub_id,
            event_kind: 4,
            timestamp: now,
        }
        .publish(&env);

        Self::record_log(
            &env,
            sub_id,
            5,
            soroban_sdk::String::from_str(&env, "Subscription cancelled"),
        );

        StateTransition {
            sub_id,
            new_state: SubscriptionState::Cancelled,
        }
        .publish(&env);
    }

    pub fn get_sub(env: Env, sub_id: u64) -> SubscriptionData {
        env.storage()
            .persistent()
            .get(&sub_id)
            .expect("Subscription not found")
    }

    pub fn get_lifecycle(env: Env, sub_id: u64) -> LifecycleTimestamps {
        let lc_key = LifecycleKey {
            lifecycle_sub_id: sub_id,
        };
        env.storage()
            .persistent()
            .get(&lc_key)
            .expect("Lifecycle data not found")
    }

    // ── Executor management ───────────────────────────────────────

    pub fn set_executor(env: Env, sub_id: u64, executor: Address) {
        let data: SubscriptionData = env
            .storage()
            .persistent()
            .get(&sub_id)
            .expect("Subscription not found");

        data.owner.require_auth();

        let key = ExecutorKey { sub_id };
        env.storage().persistent().set(&key, &executor);

        ExecutorAssigned { sub_id, executor }.publish(&env);
    }

    pub fn remove_executor(env: Env, sub_id: u64) {
        let data: SubscriptionData = env
            .storage()
            .persistent()
            .get(&sub_id)
            .expect("Subscription not found");

        data.owner.require_auth();

        let key = ExecutorKey { sub_id };
        env.storage().persistent().remove(&key);

        ExecutorRemoved { sub_id }.publish(&env);
    }

    pub fn get_executor(env: Env, sub_id: u64) -> Option<Address> {
        let key = ExecutorKey { sub_id };
        env.storage().persistent().get(&key)
    }

    // ── Renewal window management ─────────────────────────────────

    pub fn set_window(env: Env, sub_id: u64, billing_start: u64, billing_end: u64) {
        let data: SubscriptionData = env
            .storage()
            .persistent()
            .get(&sub_id)
            .expect("Subscription not found");

        data.owner.require_auth();

        if billing_start >= billing_end {
            panic!("Invalid window: start must be before end");
        }

        let window = RenewalWindow {
            billing_start,
            billing_end,
        };

        let key = WindowKey { sub_id };
        env.storage().persistent().set(&key, &window);

        WindowUpdated {
            sub_id,
            billing_start,
            billing_end,
        }
        .publish(&env);
    }

    pub fn get_window(env: Env, sub_id: u64) -> Option<RenewalWindow> {
        let key = WindowKey { sub_id };
        env.storage().persistent().get(&key)
    }

    // ── Approval management ───────────────────────────────────────

    pub fn approve_renewal(
        env: Env,
        sub_id: u64,
        approval_id: u64,
        max_spend: i128,
        expires_at: u32,
    ) {
        let sub_key = sub_id;
        let data: SubscriptionData = env
            .storage()
            .persistent()
            .get(&sub_key)
            .expect("Subscription not found");

        data.owner.require_auth();

        let approval = RenewalApproval {
            sub_id,
            max_spend,
            expires_at,
            used: false,
        };

        let key = ApprovalKey {
            sub_id,
            approval_id,
        };
        env.storage().persistent().set(&key, &approval);

        ApprovalCreated {
            sub_id,
            approval_id,
            max_spend,
            expires_at,
        }
        .publish(&env);
    }

    fn consume_approval(env: &Env, sub_id: u64, approval_id: u64, amount: i128) -> bool {
        let key = ApprovalKey {
            sub_id,
            approval_id,
        };

        let approval_opt: Option<RenewalApproval> = env.storage().persistent().get(&key);

        if approval_opt.is_none() {
            ApprovalRejected {
                sub_id,
                approval_id,
                reason: 4,
            }
            .publish(env);
            return false;
        }

        let mut approval = approval_opt.unwrap();

        if approval.used {
            ApprovalRejected {
                sub_id,
                approval_id,
                reason: 2,
            }
            .publish(env);
            return false;
        }

        let current_ledger = env.ledger().sequence();
        if current_ledger > approval.expires_at {
            ApprovalRejected {
                sub_id,
                approval_id,
                reason: 1,
            }
            .publish(env);
            return false;
        }

        if amount > approval.max_spend {
            ApprovalRejected {
                sub_id,
                approval_id,
                reason: 3,
            }
            .publish(env);
            return false;
        }

        approval.used = true;
        env.storage().persistent().set(&key, &approval);
        true
    }

    // ── Renewal lock management ────────────────────────────────────

    pub fn acquire_renewal_lock(env: Env, sub_id: u64, lock_timeout: u32) {
        if Self::is_paused(env.clone()) {
            panic!("Protocol is paused");
        }

        let lock_key = RenewalLockKey {
            lock_sub_id: sub_id,
        };
        let current_ledger = env.ledger().sequence();

        if let Some(existing) = env
            .storage()
            .persistent()
            .get::<RenewalLockKey, RenewalLockData>(&lock_key)
        {
            if current_ledger < existing.locked_at + existing.lock_timeout {
                panic!("Renewal lock active");
            }
            RenewalLockExpired {
                sub_id,
                original_locked_at: existing.locked_at,
                expired_at: current_ledger,
            }
            .publish(&env);
        }

        let lock_data = RenewalLockData {
            locked_at: current_ledger,
            lock_timeout,
        };
        env.storage().persistent().set(&lock_key, &lock_data);

        RenewalLockAcquired {
            sub_id,
            locked_at: current_ledger,
            lock_timeout,
        }
        .publish(&env);
    }

    pub fn release_renewal_lock(env: Env, sub_id: u64) {
        let lock_key = RenewalLockKey {
            lock_sub_id: sub_id,
        };
        if !env.storage().persistent().has(&lock_key) {
            panic!("No renewal lock to release");
        }

        let current_ledger = env.ledger().sequence();
        env.storage().persistent().remove(&lock_key);

        RenewalLockReleased {
            sub_id,
            released_at: current_ledger,
        }
        .publish(&env);
    }

    pub fn get_renewal_lock(env: Env, sub_id: u64) -> Option<RenewalLockData> {
        let lock_key = RenewalLockKey {
            lock_sub_id: sub_id,
        };
        env.storage().persistent().get(&lock_key)
    }

    // ── Renewal logic ─────────────────────────────────────────────

    pub fn renew(
        env: Env,
        caller: Address,
        sub_id: u64,
        approval_id: u64,
        amount: i128,
        max_retries: u32,
        cooldown_ledgers: u32,
        cycle_id: u64,
        succeed: bool,
    ) -> bool {
        if Self::is_paused(env.clone()) {
            panic!("Protocol is paused");
        }

        let key = sub_id;
        let mut data: SubscriptionData = env
            .storage()
            .persistent()
            .get(&key)
            .expect("Subscription not found");

        caller.require_auth();
        let executor_key = ExecutorKey { sub_id };
        let executor: Option<Address> = env.storage().persistent().get(&executor_key);

        if caller != data.owner && Some(caller.clone()) != executor {
            panic!("Unauthorized: caller must be owner or executor");
        }

        if !Self::consume_approval(&env, sub_id, approval_id, amount) {
            panic!("Invalid or expired approval");
        }

        let window_key = WindowKey { sub_id };
        if let Some(window) = env
            .storage()
            .persistent()
            .get::<WindowKey, RenewalWindow>(&window_key)
        {
            let current_time = env.ledger().timestamp();
            if current_time < window.billing_start || current_time > window.billing_end {
                panic!("Outside renewal window");
            }
        }

        if data.state == SubscriptionState::Failed {
            panic!("Subscription is in FAILED state");
        }

        let current_ledger = env.ledger().sequence();

        // 4. Verify renewal lock exists and is not expired
        let lock_key = RenewalLockKey {
            lock_sub_id: sub_id,
        };
        let lock_data: Option<RenewalLockData> = env.storage().persistent().get(&lock_key);
        let current_ledger = env.ledger().sequence();
        match lock_data {
            None => panic!("Renewal lock required"),
            Some(ref ld) => {
                if current_ledger >= ld.locked_at + ld.lock_timeout {
                    panic!("Renewal lock expired");
                }
            }
        }

        let cycle_key = CycleKey { sub_id };
        let last_cycle: Option<u64> = env.storage().persistent().get(&cycle_key);
        if let Some(last) = last_cycle {
            if cycle_id == last {
                DuplicateRenewalRejected { sub_id, cycle_id }.publish(&env);
                panic!("Duplicate renewal for cycle");
            }
        }

        if data.failure_count > 0 && current_ledger < data.last_attempt_ledger + cooldown_ledgers {
            panic!("Cooldown period active");
        }

        let mut integrity_data = soroban_sdk::Vec::<soroban_sdk::Val>::new(&env);
        integrity_data.push_back(data.merchant.into_val(&env));
        integrity_data.push_back(data.amount.into_val(&env));
        integrity_data.push_back(data.frequency.into_val(&env));
        integrity_data.push_back(data.spending_cap.into_val(&env));

        let current_hash = env.crypto().sha256(&integrity_data.to_xdr(&env));
        let current_hash_bytes: soroban_sdk::BytesN<32> = current_hash.into();

        if current_hash_bytes.as_ref() != data.integrity_hash.as_ref() {
            IntegrityViolation { sub_id }.publish(&env);
            panic!("Subscription integrity violation: parameters tampered");
        }

        if succeed {
            let previous_state = data.state;

            data.state = SubscriptionState::Active;
            data.failure_count = 0;
            data.last_attempt_ledger = current_ledger;
            env.storage().persistent().set(&key, &data);

            env.storage().persistent().set(&cycle_key, &cycle_id);

            RenewalSuccess {
                sub_id,
                owner: data.owner.clone(),
            }
            .publish(&env);

            let lc_key = LifecycleKey {
                lifecycle_sub_id: sub_id,
            };
            let mut lifecycle: LifecycleTimestamps = env
                .storage()
                .persistent()
                .get(&lc_key)
                .expect("Lifecycle data not found");
            let now = env.ledger().timestamp();
            lifecycle.last_renewed_at = now;

            LifecycleTimestampUpdated {
                sub_id,
                event_kind: 3,
                timestamp: now,
            }
            .publish(&env);

            if previous_state == SubscriptionState::Retrying {
                lifecycle.activated_at = now;
                LifecycleTimestampUpdated {
                    sub_id,
                    event_kind: 2,
                    timestamp: now,
                }
                .publish(&env);
            }
            env.storage().persistent().set(&lc_key, &lifecycle);

            env.storage().persistent().remove(&lock_key);
            RenewalLockReleased {
                sub_id,
                released_at: current_ledger,
            }
            .publish(&env);

            Self::record_log(
                &env,
                sub_id,
                2,
                soroban_sdk::String::from_str(&env, "Renewal successful"),
            );

            true
        } else {
            data.failure_count += 1;
            data.last_attempt_ledger = current_ledger;

            RenewalFailed {
                sub_id,
                failure_count: data.failure_count,
                ledger: current_ledger,
            }
            .publish(&env);

            if data.failure_count > max_retries {
                data.state = SubscriptionState::Failed;
                StateTransition {
                    sub_id,
                    new_state: SubscriptionState::Failed,
                }
                .publish(&env);

                Self::record_log(
                    &env,
                    sub_id,
                    3,
                    soroban_sdk::String::from_str(&env, "Renewal failed - max retries exceeded"),
                );
            } else {
                data.state = SubscriptionState::Retrying;
                StateTransition {
                    sub_id,
                    new_state: SubscriptionState::Retrying,
                }
                .publish(&env);

                Self::record_log(
                    &env,
                    sub_id,
                    4,
                    soroban_sdk::String::from_str(&env, "Renewal failed - scheduled for retry"),
                );
            }

            env.storage().persistent().set(&key, &data);

            env.storage().persistent().remove(&lock_key);
            RenewalLockReleased {
                sub_id,
                released_at: current_ledger,
            }
            .publish(&env);

            false
        }
    }

    // ── Internal helpers ──────────────────────────────────────────

    fn record_log(env: &Env, sub_id: u64, event_type: u32, data_str: soroban_sdk::String) {
        if let Some(_log_addr) = env
            .storage()
            .instance()
            .get::<_, Address>(&ContractKey::LoggingContract)
        {
            env.events().publish(
                (soroban_sdk::symbol_short!("log"), sub_id),
                (event_type, data_str),
            );
        }
    }
}

#[cfg(test)]
mod test;


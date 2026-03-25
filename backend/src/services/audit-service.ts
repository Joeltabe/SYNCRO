import { supabase } from '../config/database';
import logger from '../config/logger';

export interface AuditEntry {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditEventBatch {
  events: AuditEntry[];
}

class AuditService {
  /**
   * Validate an audit entry
   */
  private validateEntry(entry: AuditEntry): { valid: boolean; error?: string } {
    if (!entry.action || typeof entry.action !== 'string') {
      return { valid: false, error: 'action is required and must be a string' };
    }

    if (!entry.resourceType || typeof entry.resourceType !== 'string') {
      return { valid: false, error: 'resourceType is required and must be a string' };
    }

    if (entry.metadata && typeof entry.metadata !== 'object') {
      return { valid: false, error: 'metadata must be an object' };
    }

    return { valid: true };
  }

  /**
   * Insert a single audit entry
   */
  async insertEntry(entry: AuditEntry): Promise<{ success: boolean; error?: string }> {
    const validation = this.validateEntry(entry);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      const { error } = await supabase.from('audit_logs').insert([
        {
          user_id: entry.userId || null,
          action: entry.action,
          resource_type: entry.resourceType,
          resource_id: entry.resourceId || null,
          metadata: entry.metadata || null,
          ip_address: entry.ipAddress || null,
          user_agent: entry.userAgent || null,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        logger.error('Error inserting audit log:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      logger.error('Exception while inserting audit log:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Insert a batch of audit entries
   */
  async insertBatch(entries: AuditEntry[]): Promise<{ success: boolean; inserted: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let inserted = 0;
    let failed = 0;

    // Validate all entries first
    const validEntries = entries.filter((entry) => {
      const validation = this.validateEntry(entry);
      if (!validation.valid) {
        errors.push(`${validation.error}`);
        failed++;
        return false;
      }
      return true;
    });

    if (validEntries.length === 0) {
      logger.warn('No valid entries in batch for audit logging');
      return { success: false, inserted: 0, failed, errors };
    }

    try {
      const formattedEntries = validEntries.map((entry) => ({
        user_id: entry.userId || null,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId || null,
        metadata: entry.metadata || null,
        ip_address: entry.ipAddress || null,
        user_agent: entry.userAgent || null,
        created_at: new Date().toISOString(),
      }));

      const { error, data } = await supabase
        .from('audit_logs')
        .insert(formattedEntries)
        .select();

      if (error) {
        logger.error('Error inserting audit log batch:', error);
        return { success: false, inserted: 0, failed: entries.length, errors: [error.message] };
      }

      inserted = data?.length || validEntries.length;

      logger.info(`Batch audit logging successful: ${inserted} entries inserted`);
      return { success: true, inserted, failed, errors };
    } catch (error) {
      logger.error('Exception while inserting audit log batch:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);
      return { success: false, inserted: 0, failed: entries.length, errors };
    }
  }

  /**
   * Query audit logs for a specific user
   */
  async getUserLogs(
    userId: string,
    options?: {
      action?: string;
      resourceType?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<AuditEntry[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.action) {
        query = query.eq('action', options.action);
      }

      if (options?.resourceType) {
        query = query.eq('resource_type', options.resourceType);
      }

      const limit = options?.limit || 100;
      const offset = options?.offset || 0;

      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching user audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Exception while fetching user audit logs:', error);
      return [];
    }
  }

  /**
   * Query all audit logs (admin only)
   */
  async getAllLogs(options?: {
    action?: string;
    resourceType?: string;
    userId?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<AuditEntry[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (options?.action) {
        query = query.eq('action', options.action);
      }

      if (options?.resourceType) {
        query = query.eq('resource_type', options.resourceType);
      }

      if (options?.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('created_at', options.endDate);
      }

      const limit = options?.limit || 100;
      const offset = options?.offset || 0;

      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching all audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Exception while fetching all audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit logs count
   */
  async getLogsCount(options?: {
    action?: string;
    resourceType?: string;
    userId?: string;
  }): Promise<number> {
    try {
      let query = supabase.from('audit_logs').select('*', { count: 'exact', head: true });

      if (options?.action) {
        query = query.eq('action', options.action);
      }

      if (options?.resourceType) {
        query = query.eq('resource_type', options.resourceType);
      }

      if (options?.userId) {
        query = query.eq('user_id', options.userId);
      }

      const { count, error } = await query;

      if (error) {
        logger.error('Error counting audit logs:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      logger.error('Exception while counting audit logs:', error);
      return 0;
    }
  }
}

export const auditService = new AuditService();

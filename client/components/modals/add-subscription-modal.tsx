"use client"

import { useState } from "react"
import { X, Search, Plus } from "lucide-react"

interface SubscriptionTool {
  name: string
  category: string
  subcategory: string
  price: number
  logo?: string
  tags: string[]
}

const allSubscriptions: SubscriptionTool[] = [
  // AI Tools
  {
    name: "ChatGPT Plus",
    category: "AI Tools",
    subcategory: "AI Chat",
    price: 20,
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg",
    tags: ["chat", "ai"],
  },
  {
    name: "Midjourney",
    category: "AI Tools",
    subcategory: "Image Generation",
    price: 30,
    logo: "https://styles.redditmedia.com/t5_5smhl/styles/communityIcon_5jyxjq0w8vc91.png",
    tags: ["image", "ai"],
  },
  {
    name: "Claude Pro",
    category: "AI Tools",
    subcategory: "AI Chat",
    price: 20,
    logo: "https://mintlify.s3-us-west-1.amazonaws.com/anthropic/logo/light.svg",
    tags: ["chat", "ai"],
  },
  {
    name: "GitHub Copilot",
    category: "AI Tools",
    subcategory: "Code Generation",
    price: 10,
    logo: "https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png",
    tags: ["code", "ai"],
  },
  {
    name: "Gemini Advanced",
    category: "AI Tools",
    subcategory: "AI Chat",
    price: 20,
    logo: "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg",
    tags: ["chat", "ai"],
  },
  {
    name: "Perplexity Pro",
    category: "AI Tools",
    subcategory: "Search",
    price: 20,
    logo: "https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/perplexity-ai-icon.png",
    tags: ["search", "ai"],
  },
  {
    name: "Jasper AI",
    category: "AI Tools",
    subcategory: "Content Writing",
    price: 49,
    logo: "https://cdn.prod.website-files.com/628fadb065e1e0c1e8e0b6e6/64c2f5f0e9a8c1e8e0b6e6e6_jasper-logo.svg",
    tags: ["writing", "ai"],
  },

  // Streaming Services
  {
    name: "Netflix",
    category: "Streaming",
    subcategory: "Video",
    price: 15.49,
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg",
    tags: ["video", "entertainment"],
  },
  {
    name: "Spotify",
    category: "Streaming",
    subcategory: "Music",
    price: 10.99,
    logo: "https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg",
    tags: ["music", "audio"],
  },
  {
    name: "Disney+",
    category: "Streaming",
    subcategory: "Video",
    price: 13.99,
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg",
    tags: ["video", "entertainment"],
  },
  {
    name: "Hulu",
    category: "Streaming",
    subcategory: "Video",
    price: 14.99,
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e4/Hulu_Logo.svg",
    tags: ["video", "entertainment"],
  },
  {
    name: "Apple Music",
    category: "Streaming",
    subcategory: "Music",
    price: 10.99,
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/5f/Apple_Music_icon.svg",
    tags: ["music", "audio"],
  },
  {
    name: "YouTube Premium",
    category: "Streaming",
    subcategory: "Video",
    price: 13.99,
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg",
    tags: ["video", "entertainment"],
  },
  {
    name: "HBO Max",
    category: "Streaming",
    subcategory: "Video",
    price: 15.99,
    logo: "https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg",
    tags: ["video", "entertainment"],
  },

  // Productivity Tools
  {
    name: "Notion",
    category: "Productivity",
    subcategory: "Notes & Docs",
    price: 10,
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png",
    tags: ["productivity", "notes"],
  },
  {
    name: "Microsoft 365",
    category: "Productivity",
    subcategory: "Office Suite",
    price: 6.99,
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
    tags: ["productivity", "office"],
  },
  {
    name: "Google Workspace",
    category: "Productivity",
    subcategory: "Office Suite",
    price: 6,
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/5f/Google_Workspace_Logo.svg",
    tags: ["productivity", "office"],
  },
  {
    name: "Evernote",
    category: "Productivity",
    subcategory: "Notes & Docs",
    price: 10.83,
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e4/Evernote_Icon.png",
    tags: ["productivity", "notes"],
  },
  {
    name: "Todoist",
    category: "Productivity",
    subcategory: "Task Management",
    price: 4,
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Todoist_logo.svg",
    tags: ["productivity", "tasks"],
  },
  {
    name: "Dropbox",
    category: "Productivity",
    subcategory: "Cloud Storage",
    price: 11.99,
    logo: "https://upload.wikimedia.org/wikipedia/commons/7/78/Dropbox_Icon.svg",
    tags: ["storage", "cloud"],
  },
  {
    name: "Zoom",
    category: "Productivity",
    subcategory: "Video Conferencing",
    price: 14.99,
    logo: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Zoom_Communications_Logo.svg",
    tags: ["video", "meetings"],
  },

  // Design Tools
  {
    name: "Adobe Creative Cloud",
    category: "Design",
    subcategory: "Design Suite",
    price: 54.99,
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Adobe_Creative_Cloud_rainbow_icon.svg",
    tags: ["design", "creative"],
  },
  {
    name: "Figma",
    category: "Design",
    subcategory: "UI/UX Design",
    price: 12,
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg",
    tags: ["design", "ui"],
  },
  {
    name: "Canva Pro",
    category: "Design",
    subcategory: "Graphic Design",
    price: 12.99,
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/08/Canva_icon_2021.svg",
    tags: ["design", "graphics"],
  },
  {
    name: "Sketch",
    category: "Design",
    subcategory: "UI/UX Design",
    price: 9,
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/59/Sketch_Logo.svg",
    tags: ["design", "ui"],
  },

  // Development Tools
  {
    name: "GitHub Pro",
    category: "Development",
    subcategory: "Version Control",
    price: 4,
    logo: "https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png",
    tags: ["development", "code"],
  },
  {
    name: "Vercel Pro",
    category: "Development",
    subcategory: "Hosting",
    price: 20,
    logo: "https://assets.vercel.com/image/upload/front/favicon/vercel/180x180.png",
    tags: ["development", "hosting"],
  },
  {
    name: "AWS",
    category: "Development",
    subcategory: "Cloud Services",
    price: 50,
    logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg",
    tags: ["development", "cloud"],
  },
  {
    name: "Heroku",
    category: "Development",
    subcategory: "Hosting",
    price: 7,
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Heroku_logo.svg",
    tags: ["development", "hosting"],
  },

  // Finance Tools
  {
    name: "QuickBooks",
    category: "Finance",
    subcategory: "Accounting",
    price: 30,
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/3f/QuickBooks_logo.svg",
    tags: ["finance", "accounting"],
  },
  {
    name: "FreshBooks",
    category: "Finance",
    subcategory: "Accounting",
    price: 17,
    logo: "https://www.freshbooks.com/wp-content/uploads/freshbooks-logo.svg",
    tags: ["finance", "accounting"],
  },

  // Health & Fitness
  {
    name: "Peloton",
    category: "Health",
    subcategory: "Fitness",
    price: 44,
    logo: "https://upload.wikimedia.org/wikipedia/commons/6/6d/Peloton_logo.svg",
    tags: ["health", "fitness"],
  },
  {
    name: "Headspace",
    category: "Health",
    subcategory: "Meditation",
    price: 12.99,
    logo: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Headspace_logo.svg",
    tags: ["health", "meditation"],
  },
  {
    name: "Calm",
    category: "Health",
    subcategory: "Meditation",
    price: 14.99,
    logo: "https://www.calm.com/favicon.ico",
    tags: ["health", "meditation"],
  },

  // Gaming
  {
    name: "PlayStation Plus",
    category: "Gaming",
    subcategory: "Console",
    price: 9.99,
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/00/PlayStation_logo.svg",
    tags: ["gaming", "entertainment"],
  },
  {
    name: "Xbox Game Pass",
    category: "Gaming",
    subcategory: "Console",
    price: 16.99,
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Xbox_one_logo.svg",
    tags: ["gaming", "entertainment"],
  },
]

export default function AddSubscriptionModal({ onAdd, onClose, darkMode }: { onAdd: (subscription: any) => void; onClose: () => void; darkMode?: boolean }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTool, setSelectedTool] = useState<SubscriptionTool | null>(null)
  const [customMode, setCustomMode] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [formData, setFormData] = useState<{
    name: string
    category: string
    subcategory: string
    price: string
    logo: string
    tags: string[]
  }>({
    name: "",
    category: "AI Tools",
    subcategory: "",
    price: "",
    logo: "",
    tags: [],
  })

  const categories = [
    "All",
    "AI Tools",
    "Streaming",
    "Productivity",
    "Design",
    "Development",
    "Finance",
    "Health",
    "Gaming",
  ]

  const filteredTools = allSubscriptions.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.subcategory.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" || tool.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleSelectTool = (tool: SubscriptionTool) => {
    setSelectedTool(tool)
    setFormData({
      name: tool.name,
      category: tool.category,
      subcategory: tool.subcategory,
      price: tool.price.toString(),
      logo: tool.logo || "",
      tags: tool.tags,
    })
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (formData.name && formData.price) {
      onAdd({
        ...formData,
        price: Number.parseFloat(formData.price),
        renewsIn: 30,
        status: "active",
        icon: formData.logo ? "🔗" : "🎨",
        color: "#000000",
      })
    }
  }

  const handleButtonSubmit = () => {
    if (formData.name && formData.price) {
      onAdd({
        ...formData,
        price: Number.parseFloat(formData.price),
        renewsIn: 30,
        status: "active",
        icon: formData.logo ? "🔗" : "🎨",
        color: "#000000",
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-labelledby="add-modal-title"
        aria-modal="true"
        className={`${darkMode ? "bg-[#2D3748] text-[#F9F6F2]" : "bg-white text-[#1E2A35]"} rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1E2A35] to-[#2D3748] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="add-modal-title" className="text-2xl font-bold text-white">Add Subscription</h2>
              <p className="text-sm text-gray-300 mt-1">Track all your subscriptions in one place</p>
            </div>
            <button onClick={onClose} aria-label="Close add subscription dialog" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X aria-hidden="true" className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!customMode ? (
            <>
              {/* Search Bar */}
              <div className="mb-4">
                <label htmlFor="add-sub-search" className="sr-only">Search for a subscription service</label>
                <div
                  className={`flex items-center gap-3 px-4 py-3 ${darkMode ? "bg-[#1E2A35]" : "bg-[#F9F6F2]"} rounded-lg`}
                >
                  <Search aria-hidden="true" className="w-5 h-5 text-gray-400" />
                  <input
                    id="add-sub-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for subscriptions..."
                    className="flex-1 bg-transparent outline-none"
                  />
                </div>
              </div>

              <div role="group" aria-label="Filter by category" className="mb-6 flex gap-2 overflow-x-auto pb-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    aria-pressed={selectedCategory === cat}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? "bg-[#FFD166] text-[#1E2A35]"
                        : darkMode
                          ? "bg-[#1E2A35] text-gray-300 hover:bg-[#374151]"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Popular Tools Grid */}
              <div role="list" aria-label="Available subscriptions" className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {filteredTools.map((tool) => (
                  <button
                    key={tool.name}
                    role="listitem"
                    onClick={() => handleSelectTool(tool)}
                    aria-pressed={selectedTool?.name === tool.name}
                    aria-label={`${tool.name}, ${tool.subcategory}, $${tool.price}/month`}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedTool?.name === tool.name
                        ? "border-[#FFD166] bg-[#FFD166]/10"
                        : darkMode
                          ? "border-[#374151] hover:border-[#FFD166]/50"
                          : "border-gray-200 hover:border-[#FFD166]"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src={tool.logo || "/placeholder.svg"}
                        alt=""
                        aria-hidden="true"
                        className="w-8 h-8 rounded-lg object-contain bg-white p-1"
                      />
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-sm">{tool.name}</p>
                        <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>{tool.subcategory}</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-[#FFD166]">${tool.price}/mo</p>
                  </button>
                ))}
              </div>

              {/* Custom Tool Button */}
              <button
                onClick={() => setCustomMode(true)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed ${
                  darkMode ? "border-[#374151] hover:border-[#FFD166]" : "border-gray-300 hover:border-[#1E2A35]"
                } rounded-lg transition-colors`}
              >
                <Plus aria-hidden="true" className="w-4 h-4" />
                Add Custom Subscription
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="custom-name" className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Subscription Name <span aria-hidden="true">*</span>
                </label>
                <input
                  id="custom-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Custom Tool"
                  aria-required="true"
                  className={`w-full px-4 py-3 ${darkMode ? "bg-[#1E2A35] border-[#374151]" : "bg-white border-gray-300"} border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD166]`}
                />
              </div>

              <div>
                <label htmlFor="custom-category" className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Category
                </label>
                <select
                  id="custom-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={`w-full px-4 py-3 ${darkMode ? "bg-[#1E2A35] border-[#374151]" : "bg-white border-gray-300"} border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD166]`}
                >
                  {categories
                    .filter((cat) => cat !== "All")
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="custom-price" className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Monthly Price ($) <span aria-hidden="true">*</span>
                </label>
                <input
                  id="custom-price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="e.g., 20"
                  aria-required="true"
                  className={`w-full px-4 py-3 ${darkMode ? "bg-[#1E2A35] border-[#374151]" : "bg-white border-gray-300"} border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD166]`}
                />
              </div>

              <div>
                <label htmlFor="custom-logo" className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Logo URL (optional)
                </label>
                <input
                  id="custom-logo"
                  type="url"
                  value={formData.logo}
                  onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className={`w-full px-4 py-3 ${darkMode ? "bg-[#1E2A35] border-[#374151]" : "bg-white border-gray-300"} border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD166]`}
                />
              </div>

              <button
                type="button"
                onClick={() => setCustomMode(false)}
                className={`text-sm ${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-800"}`}
              >
                ← Back to subscriptions
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${darkMode ? "border-[#374151]" : "border-gray-200"}`}>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-3 border-2 ${darkMode ? "border-[#374151] hover:border-[#FFD166]" : "border-gray-300 hover:border-[#1E2A35]"} rounded-lg font-medium transition-colors`}
            >
              Cancel
            </button>
            <button
              onClick={
                customMode
                  ? handleButtonSubmit
                  : () =>
                      selectedTool &&
                      onAdd({
                        ...selectedTool,
                        renewsIn: 30,
                        status: "active",
                        icon: "🔗",
                        color: "#000000",
                      })
              }
              disabled={customMode ? !formData.name || !formData.price : !selectedTool}
              aria-disabled={customMode ? !formData.name || !formData.price : !selectedTool}
              className="flex-1 px-4 py-3 bg-[#FFD166] text-[#1E2A35] rounded-lg font-semibold hover:bg-[#FFD166]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

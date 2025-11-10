/**
 * ChatHelp Component
 *
 * Displays available commands/tools that the chatbot can use
 * Shows user-friendly descriptions organized by category
 */

'use client';

import React from 'react';
import {
  Search,
  User,
  FileText,
  Users,
  DollarSign,
  MessageSquare,
  Building,
  Scale,
  AlertTriangle,
  X
} from 'lucide-react';

interface Tool {
  name: string;
  description: string;
  examples: string[];
}

interface ToolCategory {
  title: string;
  icon: React.ReactNode;
  tools: Tool[];
}

const toolCategories: ToolCategory[] = [
  {
    title: 'MPs & Politicians',
    icon: <User className="w-5 h-5" />,
    tools: [
      {
        name: 'Search for MPs',
        description: 'Find Members of Parliament by name, party, or riding',
        examples: [
          'Who are the Conservative MPs?',
          'Find MPs from Ontario',
          'Show me cabinet ministers'
        ]
      },
      {
        name: 'MP Profile',
        description: 'Get detailed information about a specific MP including bio, bills, expenses, and voting record',
        examples: [
          'Tell me about Pierre Poilievre',
          'What bills has Chrystia Freeland sponsored?',
          'Show Justin Trudeau\'s voting record'
        ]
      },
      {
        name: 'MP Performance Scorecard',
        description: 'Comprehensive overview of an MP\'s activity: bills, votes, petitions, expenses, and meetings',
        examples: [
          'How effective is Jagmeet Singh as an MP?',
          'Show me Pierre Poilievre\'s scorecard',
          'What has Mark Carney accomplished?'
        ]
      },
      {
        name: 'MP Speeches',
        description: 'Get recent speeches and statements by a specific MP',
        examples: [
          'What has Pierre Poilievre said recently?',
          'Show me Jagmeet Singh\'s latest speeches'
        ]
      }
    ]
  },
  {
    title: 'Bills & Legislation',
    icon: <FileText className="w-5 h-5" />,
    tools: [
      {
        name: 'Search Bills',
        description: 'Find bills by number or keywords in title/summary',
        examples: [
          'What is Bill C-47 about?',
          'Find bills about climate change',
          'Show recent government bills'
        ]
      },
      {
        name: 'Bill Details',
        description: 'Get full information about a bill including sponsors, status, votes, and legislative history',
        examples: [
          'Show me details for Bill C-47',
          'What\'s the status of Bill S-12?',
          'Who sponsored Bill C-234?'
        ]
      },
      {
        name: 'Bill Lobbying',
        description: 'See which organizations and lobbyists are influencing a specific bill',
        examples: [
          'Who\'s lobbying on Bill C-47?',
          'What corporations are interested in Bill C-234?',
          'Show lobbying activity for the budget bill'
        ]
      },
      {
        name: 'Bill Debates',
        description: 'Read House debates and speeches about a specific bill',
        examples: [
          'What did MPs say about Bill C-47?',
          'Show debates on the budget bill',
          'What are the arguments for Bill C-234?'
        ]
      }
    ]
  },
  {
    title: 'Debates & Hansard',
    icon: <MessageSquare className="w-5 h-5" />,
    tools: [
      {
        name: 'Search Hansard (Comprehensive)',
        description: 'Search all parliamentary speeches and debates with advanced filters',
        examples: [
          'What have MPs said about carbon pricing?',
          'Find speeches about healthcare in 2024',
          'Search Finance Committee discussions on banking',
          'Show debates on climate change, excluding procedural statements'
        ]
      },
      {
        name: 'Recent Debates',
        description: 'Get the latest debates from the House of Commons',
        examples: [
          'What are the recent debates?',
          'Show me today\'s parliamentary discussions'
        ]
      }
    ]
  },
  {
    title: 'Committees',
    icon: <Users className="w-5 h-5" />,
    tools: [
      {
        name: 'List Committees',
        description: 'Get all parliamentary committees with their mandates',
        examples: [
          'What committees exist?',
          'Show me all House committees',
          'List active committees'
        ]
      },
      {
        name: 'Committee Details',
        description: 'Get information about a specific committee including members and mandate',
        examples: [
          'Tell me about the Finance Committee',
          'Who sits on HESA?',
          'What does the Environment Committee do?'
        ]
      },
      {
        name: 'Committee Testimony',
        description: 'Get witness testimony and statements from committee meetings',
        examples: [
          'Show testimony at Finance Committee',
          'What did witnesses say at HESA meetings?',
          'Find recent committee evidence'
        ]
      }
    ]
  },
  {
    title: 'Accountability & Spending',
    icon: <DollarSign className="w-5 h-5" />,
    tools: [
      {
        name: 'MP Expenses',
        description: 'View quarterly expense reports for MPs',
        examples: [
          'How much did Pierre Poilievre spend last quarter?',
          'Show travel expenses for Liberal MPs',
          'What are the hospitality expenses?'
        ]
      },
      {
        name: 'Top Spenders',
        description: 'Find MPs who spent the most in a fiscal period',
        examples: [
          'Who spent the most in Q1 2024?',
          'Show the top 10 spenders',
          'Which MPs have the highest expenses?'
        ]
      }
    ]
  },
  {
    title: 'Lobbying & Influence',
    icon: <Building className="w-5 h-5" />,
    tools: [
      {
        name: 'Search Lobbying',
        description: 'Find lobbying registrations by organization or lobbyist name',
        examples: [
          'Who lobbies for Pfizer?',
          'Show pharmaceutical lobbying',
          'What is Rogers lobbying about?'
        ]
      },
      {
        name: 'Detect Conflicts of Interest',
        description: 'Analyze potential conflicts by cross-referencing votes, lobbying, and expenses',
        examples: [
          'Are there any conflicts of interest?',
          'Show suspicious voting patterns',
          'Check for MP-lobbyist connections'
        ]
      }
    ]
  }
];

interface ChatHelpProps {
  onClose: () => void;
}

export function ChatHelp({ onClose }: ChatHelpProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[85vh] m-4 bg-gray-900 rounded-lg shadow-2xl border border-gray-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">What I Can Help You With</h2>
            <p className="text-sm text-gray-400 mt-1">
              Ask me questions using natural language. I'll use these tools to find answers from Canadian parliamentary data.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Close help"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Hansard Search Advanced Features */}
          <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-semibold text-white mb-2">
                  Advanced Hansard Search Filters
                </h3>
                <p className="text-sm text-gray-300 mb-3">
                  The Hansard search tool supports powerful filtering options:
                </p>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-accent-red font-medium">•</span>
                    <div>
                      <span className="font-medium">By MP:</span> "What did Pierre Poilievre say about carbon pricing?"
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-red font-medium">•</span>
                    <div>
                      <span className="font-medium">By Committee:</span> "Search Finance Committee testimony on banking"
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-red font-medium">•</span>
                    <div>
                      <span className="font-medium">Document Type:</span> "Find House debates (not committee) about healthcare"
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-red font-medium">•</span>
                    <div>
                      <span className="font-medium">Exclude Procedural:</span> "Search climate change debates, skip routine business"
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-red font-medium">•</span>
                    <div>
                      <span className="font-medium">Date Range:</span> "Find speeches about inflation in 2024"
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-red font-medium">•</span>
                    <div>
                      <span className="font-medium">Language:</span> "Search in French for 'changements climatiques'"
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Tool Categories */}
          {toolCategories.map((category, idx) => (
            <div key={idx} className="space-y-4">
              {/* Category Header */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-red/20 rounded-lg text-accent-red">
                  {category.icon}
                </div>
                <h3 className="text-lg font-semibold text-white">{category.title}</h3>
              </div>

              {/* Tools in Category */}
              <div className="space-y-3 ml-1">
                {category.tools.map((tool, toolIdx) => (
                  <div key={toolIdx} className="border-l-2 border-gray-700 pl-4 py-2 hover:border-accent-red/50 transition-colors">
                    <h4 className="text-sm font-semibold text-white mb-1">
                      {tool.name}
                    </h4>
                    <p className="text-sm text-gray-400 mb-2">
                      {tool.description}
                    </p>
                    <div className="space-y-1">
                      {tool.examples.map((example, exIdx) => (
                        <div key={exIdx} className="flex items-start gap-2 text-xs text-gray-500">
                          <span className="text-accent-red/70 mt-0.5">→</span>
                          <span className="italic">"{example}"</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Tips Section */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-accent-red" />
              Tips for Better Results
            </h3>
            <ul className="text-sm text-gray-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-accent-red">•</span>
                <span>Be specific with names and bill numbers (e.g., "Pierre Poilievre", "Bill C-47")</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-red">•</span>
                <span>Use keywords for topic searches (e.g., "climate change", "healthcare")</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-red">•</span>
                <span>Combine filters for precise results (e.g., "Finance Committee testimony on crypto in 2024")</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-red">•</span>
                <span>Ask follow-up questions to dive deeper into any topic</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              All data is sourced from official Canadian parliamentary records, lobbying registries, and open government databases.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-accent-red hover:bg-accent-red/90 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Folder, Clock, Zap, CheckCircle } from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold text-white">TeleSync</span>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-slate-300 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-slate-300 hover:text-white transition-colors">How it works</a>
              <a href="#pricing" className="text-slate-300 hover:text-white transition-colors">Pricing</a>
              <button
                onClick={() => navigate('/login')}
                className="text-slate-300 hover:text-white transition-colors"
              >
                Log in
              </button>
              <button
                onClick={() => navigate('/login')}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg"
              >
                Get started - it's free!
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
                Manual downloads
                <br />
                <span className="text-slate-300">belong in the past</span>
              </h1>
              <p className="text-xl text-slate-300 mt-6 leading-relaxed">
                Instant, seamless video downloads from Telegram channels — no 
                hardware, no manual checks, no wasted time. Focus on editing, 
                not file management.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <button
                  onClick={() => navigate('/login')}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-[1.02] font-semibold shadow-lg"
                >
                  Start automating downloads →
                </button>
                <button className="text-slate-300 hover:text-white px-8 py-4 font-semibold transition-colors">
                  Contact sales
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20">
                {/* Mock interface */}
                <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <span className="text-slate-400 text-sm">TeleSync Dashboard</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <div className="flex-1">
                        <div className="text-white text-sm font-medium">video_edit_final.mp4</div>
                        <div className="text-slate-400 text-xs">Downloaded • /Projects/Client_A/Raw/</div>
                      </div>
                      <div className="text-green-400 text-xs">2.1 GB</div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                      <Clock className="w-5 h-5 text-yellow-400 animate-spin" />
                      <div className="flex-1">
                        <div className="text-white text-sm font-medium">conference_recording.mp4</div>
                        <div className="text-slate-400 text-xs">Downloading... 76% • /Projects/Client_B/</div>
                      </div>
                      <div className="text-yellow-400 text-xs">1.8 GB</div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                      <Folder className="w-5 h-5 text-slate-400" />
                      <div className="flex-1">
                        <div className="text-white text-sm font-medium">tutorial_series_ep1.mp4</div>
                        <div className="text-slate-400 text-xs">Queued • /Projects/Tutorials/</div>
                      </div>
                      <div className="text-slate-400 text-xs">3.2 GB</div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-green-400 text-sm font-medium mb-2">
                    ✓ 247 files auto-downloaded this month
                  </div>
                  <div className="text-slate-400 text-xs">
                    Saving ~18 hours of manual work
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Built for modern editors
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Stop wasting time on file management. Let TeleSync handle the downloads 
              while you focus on creating amazing content.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-white/20 hover:bg-white/15 transition-all duration-200">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Instant Downloads</h3>
              <p className="text-slate-300">
                Videos start downloading the moment they're posted to your monitored 
                Telegram channels. No delays, no manual intervention needed.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-white/20 hover:bg-white/15 transition-all duration-200">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center mb-6">
                <Folder className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Smart Organization</h3>
              <p className="text-slate-300">
                Files are automatically sorted into custom folder structures based on 
                channel, date, or your own naming conventions. Everything exactly where you need it.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-white/20 hover:bg-white/15 transition-all duration-200">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center mb-6">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Save Hours Daily</h3>
              <p className="text-slate-300">
                Our users save 15-20 hours per week on file management. That's more time 
                for creative work and less time on tedious downloads.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-16 bg-slate-800/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-slate-400 uppercase tracking-wide font-medium mb-8">
              Trusted by 1,200+ content creators and editors
            </p>
            
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-60">
              <div className="text-2xl font-bold text-slate-300">CreativeStudio</div>
              <div className="text-2xl font-bold text-slate-300">VideoForge</div>
              <div className="text-2xl font-bold text-slate-300">EditPro</div>
              <div className="text-2xl font-bold text-slate-300">MediaFlow</div>
              <div className="text-2xl font-bold text-slate-300">ContentLab</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-800/50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to automate your workflow?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Join thousands of editors who've already eliminated manual downloads from their workflow.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-[1.02] font-semibold text-lg shadow-lg"
          >
            Start your free trial →
          </button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, FileText, Download, CheckCircle2, Video, BookOpen, Info, MessageSquare, Share2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { Course } from '../types';
import { translations, Language } from '../translations';
import { ReviewSection } from './ReviewSection';

interface CourseViewerProps {
  course: Course;
  onBack: () => void;
  userEmail: string;
  userName: string;
  language: Language;
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  // Try to match standard YouTube URL patterns
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2] && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?rel=0&autoplay=0&modestbranding=1`;
  }
  
  console.log("YouTube URL pattern mismatch for:", url);
  return null;
}

function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  const normalized = url.toLowerCase();
  return normalized.endsWith('.mp4') || 
         normalized.endsWith('.webm') || 
         normalized.endsWith('.ogg') ||
         normalized.includes('/api/telegram/stream') || 
         normalized.includes('/uploads/');
}

export default function CourseViewer({ course, onBack, userEmail, userName, language }: CourseViewerProps) {
  const t = translations[language];
  const [activeVideo, setActiveVideo] = useState(course.videos?.[0] || { id: 'v1', title: 'Getting Started', url: '' });
  const [completedVideos, setCompletedVideos] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'guide' | 'about' | 'resources' | 'reviews'>(course.guideMarkdown ? 'guide' : 'about');
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [brokenAssets, setBrokenAssets] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log("CourseViewer mounted with course:", course);
    // Verification is handled by the automated self-healing server-side processes and admin dashboard, not on student view to prevent performance issues and browser fetch errors.
  }, [course]);

  const handleDownload = async (file: { id?: string; name: string; url: string; size?: string }) => {
    const isZip = file.name.toLowerCase().endsWith('.zip') || file.name.toLowerCase().endsWith('.rar') || file.name.toLowerCase().endsWith('.7z');
    const fileName = isZip ? file.name.replace(/\.(zip|rar|7z)$/i, '.pdf') : file.name;
    
    setDownloadingFile(fileName);
    
    try {
      console.log(`Starting download for: ${file.name}, URL: ${file.url}`);
      if (isZip) {
        // Redirect zip downloads to the beautifully compiled official PDF guide
        window.open(`/api/courses/${course.id}/download-guide`, '_blank');
        setTimeout(() => setDownloadingFile(null), 2000);
        return;
      }

      if (file.url.includes('download-guide') || file.id === 'att_hindi_syllabus_guide') {
        // Download the beautifully compiled PDF guide directly from the backend API
        window.open(`/api/courses/${course.id}/download-guide`, '_blank');
        setTimeout(() => setDownloadingFile(null), 2000);
        return;
      } else if (!file.url || file.url === '#' || file.url.includes('github.com') || file.url.includes('investopedia.com') || file.url.includes('cheatsheetseries.owasp.org')) {
        // For GitHub, Investopedia, or cheat sheet pages, open in new tab as they are not direct files
        window.open(file.url, '_blank');
      } else {
        const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(file.url)}`;
        console.log(`Fetching via proxy: ${proxyUrl}`);
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch file via proxy: ${response.statusText}, Body: ${errorText}`);
          throw new Error(`Failed to fetch file via proxy: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
      }
    } catch (e) {
      console.error("Failed to download file:", e);
      window.open(file.url, '_blank');
    }

    setTimeout(() => {
      setDownloadingFile(null);
    }, 2000);
  };

  const handleMarkComplete = (id: string) => {
    if (completedVideos.includes(id)) {
      setCompletedVideos(completedVideos.filter(vId => vId !== id));
    } else {
      setCompletedVideos([...completedVideos, id]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 text-slate-900 animate-fade-in" id="course-viewer-container">
      {/* Top Back Action Bar */}
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {language === 'hi' ? 'वापस लर्निंग पोर्टल पर' : 'Back to Learning Portal'}
        </button>
        <button
          onClick={async () => {
            const url = `${window.location.origin}${window.location.pathname}?courseId=${course.id}`;
            if (navigator.share) {
              try {
                await navigator.share({
                  title: course.title,
                  text: `Check out this course: ${course.title}`,
                  url: url,
                });
              } catch (err) {
                console.error('Error sharing:', err);
              }
            } else {
              navigator.clipboard.writeText(url);
              alert(language === 'hi' ? 'लिंक कॉपी हो गया!' : 'Link copied to clipboard!');
            }
          }}
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-full font-medium transition-all text-sm"
        >
          <Share2 className="w-4 h-4" />
          {language === 'hi' ? 'शेयर करें' : 'Share Course'}
        </button>
      </div>

      {/* Header Info */}
      <div className="space-y-3" id="course-viewer-header">
        <span className="bg-indigo-600/10 text-accent-300 border border-accent-500/20 text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full inline-block">
          {course.category} MASTERCLASS
        </span>
        <h2 className="text-3xl font-bold font-display text-slate-900 tracking-tight leading-none uppercase">
          {course.title}
        </h2>
        <div className="flex items-center gap-4">
          <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">
            {completedVideos.length} / {course.videos?.length || 1} Lectures Complete
          </p>
          <div className="flex-1 max-w-[200px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 transition-all duration-500" 
              style={{ width: `${(completedVideos.length / (course.videos?.length || 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10" id="course-viewer-grid">
        
        {/* Left Side: Video Player Screen & Tabbed Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 aspect-video relative group" id="video-player-container">
            {getYouTubeEmbedUrl(activeVideo.url) ? (
              <iframe
                key={activeVideo.url}
                className="w-full h-full border-0"
                src={getYouTubeEmbedUrl(activeVideo.url)!}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : isDirectVideoUrl(activeVideo.url) ? (
              <video
                key={activeVideo.url}
                src={activeVideo.url}
                controls
                className="w-full h-full object-contain rounded-3xl bg-black"
                controlsList="nodownload"
                playsInline
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-white p-10 text-center space-y-4">
                <Video className="w-16 h-16 text-zinc-800" />
                <p className="text-slate-400 font-medium">This lecture video is currently being processed or is external.</p>
                <a href={activeVideo.url} target="_blank" rel="noopener noreferrer" className="bg-accent-600 hover:bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all">
                  Open Video URL
                </a>
              </div>
            )}
          </div>
          
          {/* YouTube Playback Fallback Hint */}
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">
            Having trouble watching? <a href={activeVideo.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-slate-900 underline">Watch directly on YouTube</a>
          </div>

          {/* Active Lesson Details & Actions */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-600/10 text-indigo-600 text-[10px] font-bold uppercase tracking-wider rounded-md border border-accent-500/20">
                  Lesson {course.videos.findIndex(v => v.id === activeVideo.id) + 1}
                </span>
                {activeVideo.isVerified && (
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-wider rounded-md border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Verified Source
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-tight">{activeVideo.title}</h3>
            </div>
            
            <a 
              href={`/api/courses/${course.id}/download-guide`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-accent-600 hover:bg-indigo-600 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-accent-600/30 group whitespace-nowrap"
            >
              <div className="bg-slate-100 p-1.5 rounded-lg group-hover:bg-slate-200 transition-colors">
                <Download className="w-4 h-4" />
              </div>
              DOWNLOAD FULL COURSE PDF
            </a>
          </div>

          {/* Tabbed Content Navigation */}
          <div className="bg-white border border-slate-200 p-2 rounded-2xl flex items-center gap-2 overflow-x-auto no-scrollbar" id="viewer-tabs">
            <button
              onClick={() => setActiveTab('guide')}
              className={`flex-1 min-w-[140px] px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                activeTab === 'guide' ? 'bg-accent-600 text-slate-900 shadow-lg' : 'text-slate-400 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4" /> Practical Guide
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`flex-1 min-w-[140px] px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                activeTab === 'about' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-100'
              }`}
            >
              <Info className="w-4 h-4" /> About Course
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`flex-1 min-w-[140px] px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 lg:hidden ${
                activeTab === 'resources' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" /> Resources
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 min-w-[140px] px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                activeTab === 'reviews' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Reviews
            </button>
          </div>

          {/* Active Tab Content Area */}
          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl min-h-[400px]" id="active-tab-content">
            {activeTab === 'guide' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center gap-4 border-b border-slate-200 pb-4">
                  <h3 className="text-xl font-bold font-display text-slate-900 uppercase tracking-tight">Step-by-Step Practical Masterclass</h3>
                  <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    <CheckCircle2 className="w-3 h-3" /> Fully Verified
                  </div>
                </div>
                <div className="prose prose-slate prose-zinc max-w-none text-slate-600">
                  <Markdown>{course.guideMarkdown || course.description}</Markdown>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-xl font-bold font-display text-slate-900 uppercase tracking-tight border-b border-slate-200 pb-4">Course Description & Value</h3>
                <div className="prose prose-slate prose-zinc max-w-none text-slate-600">
                  <Markdown>{course.description}</Markdown>
                </div>
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="space-y-6 animate-fade-in lg:hidden">
                <h3 className="text-xl font-bold font-display text-slate-900 uppercase tracking-tight border-b border-slate-200 pb-4">Downloadable Files</h3>
                <div className="space-y-3">
                  {(course.attachments || []).filter(file => !brokenAssets.has(file.id)).map((file) => (
                    <div key={file.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{file.name}</p>
                          {brokenAssets.has(file.id) && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Broken</p>}
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Size: {file.size}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDownload(file)} className="p-3 bg-slate-50 rounded-xl hover:text-slate-900 transition-all">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="animate-fade-in">
                <ReviewSection courseId={course.id} userEmail={userEmail} userName={userName} />
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Playlist Curriculum & Resource Attachments */}
        <div className="space-y-8">
          
          {/* Lectures Playlist */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl" id="viewer-playlist-card">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-200 pb-4">
              Full Syllabus Content
            </h4>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar" id="playlist-lectures">
              {(course.videos || []).filter(video => !brokenAssets.has(video.id) && (video.isVerified !== false)).map((video, idx) => (
                <button
                  key={video.id}
                  onClick={() => setActiveVideo(video)}
                  className={`w-full text-left p-4 rounded-2xl flex items-center gap-4 transition-all cursor-pointer border ${
                    activeVideo.id === video.id
                      ? 'bg-slate-50 border-accent-500/50 text-accent-300 shadow-xl'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-400'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    activeVideo.id === video.id ? 'bg-accent-600 text-slate-900' : 'bg-slate-50 text-slate-400'
                  }`}>
                    {completedVideos.includes(video.id) ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Play className={`w-5 h-5 ${activeVideo.id === video.id ? 'fill-current' : ''}`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      LECTURE {idx + 1}
                    </span>
                    <span className={`text-xs font-bold leading-tight line-clamp-2 ${activeVideo.id === video.id ? 'text-slate-900' : 'text-slate-600'}`}>
                      {video.title} {brokenAssets.has(video.id) && <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded ml-2">Broken</span>}
                    </span>
                    {video.isVerified && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                        <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Verified Source</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Downloadable files / Attachments */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl hidden lg:block" id="viewer-resources-card">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-200 pb-4">
              Premium Resources
            </h4>
            
            {downloadingFile && (
              <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-900/30 text-emerald-600 rounded-xl text-[10px] font-semibold text-center animate-pulse">
                ✓ Starting download for {downloadingFile}...
              </div>
            )}

            <div className="space-y-3" id="playlist-resources">
              {(course.attachments || []).filter(file => !brokenAssets.has(file.id)).map((file) => (
                <div
                  key={file.id}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4 group hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-50 text-slate-400 p-3 rounded-xl group-hover:text-indigo-600 transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 line-clamp-1 block">
                        {file.name} {brokenAssets.has(file.id) && <span className="text-[9px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded ml-2">Broken</span>}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
                        {file.size}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 rounded-xl text-slate-400 transition-all cursor-pointer flex items-center justify-center"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

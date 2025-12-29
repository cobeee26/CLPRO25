import React, { useEffect, useRef } from 'react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  videoPlatform: string;
  onPlay?: () => void;
  onPause?: () => void;
}

const VideoModal: React.FC<VideoModalProps> = ({ 
  isOpen, 
  onClose, 
  videoUrl, 
  videoPlatform,
  onPlay,
  onPause
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    
    try {
      const urlObj = new URL(url);
      
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        if (urlObj.hostname === 'youtu.be') {
          return urlObj.pathname.substring(1);
        }
        return urlObj.searchParams.get('v');
      }
      
      if (url.includes('vimeo.com')) {
        const pathParts = urlObj.pathname.split('/');
        return pathParts[pathParts.length - 1];
      }
      
      return null;
    } catch {
      return null;
    }
  };

  const getVideoPlatformFromUrl = (url: string): string => {
    if (!url) return 'Unknown';
    
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      return 'YouTube';
    } else if (urlLower.includes('vimeo.com')) {
      return 'Vimeo';
    } else if (urlLower.includes('drive.google.com')) {
      return 'Google Drive';
    } else if (urlLower.includes('dropbox.com')) {
      return 'Dropbox';
    } else if (urlLower.includes('onedrive.live.com')) {
      return 'OneDrive';
    } else {
      return 'Video Link';
    }
  };

  const getEmbedUrl = (url: string): string => {
    const platform = getVideoPlatformFromUrl(url);
    const videoId = extractVideoId(url);
    
    if (platform === 'YouTube' && videoId) {
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;
    } else if (platform === 'Vimeo' && videoId) {
      return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
    } else if (platform === 'Google Drive') {
      if (url.includes('/file/d/')) {
        const match = url.match(/\/file\/d\/([^/]+)/);
        if (match && match[1]) {
          return `https://drive.google.com/file/d/${match[1]}/preview`;
        }
      }
    }
    
    return url;
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => {
        if (modalRef.current && e.target === modalRef.current) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-5xl mx-4 h-[80vh] bg-black rounded-2xl overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-gray-900 to-black/90 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold">{videoPlatform} Video</h3>
              <p className="text-gray-300 text-sm truncate max-w-md">{videoUrl}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg cursor-pointer"
            title="Close"
            aria-label="Close video"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="w-full h-full pt-16">
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="w-full h-full"
            title={`${videoPlatform} Video Player`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (iframeRef.current) {
                    iframeRef.current.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                  }
                  if (onPlay) onPlay();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play
              </button>
              <button
                onClick={() => {
                  if (iframeRef.current) {
                    iframeRef.current.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                  }
                  if (onPause) onPause();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                Pause
              </button>
            </div>
            <div className="text-sm text-gray-300">
              <p>Use fullscreen for better viewing</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;
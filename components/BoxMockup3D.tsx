
import React from 'react';

interface BoxMockup3DProps {
  imageUrl: string;
  onClose: () => void;
}

/**
 * BoxMockup3D Component
 * Uses a single diecut (unfolded box) image and slices it into 6 faces using CSS.
 * Template layout expected (4 columns, 3 rows):
 * [Empty]  [Top]    [Empty]  [Empty]
 * [Left]   [Front]  [Right]  [Back]
 * [Empty]  [Bottom] [Empty]  [Empty]
 */
const BoxMockup3D: React.FC<BoxMockup3DProps> = ({ imageUrl, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-5xl h-[85vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
          <div>
            <h3 className="text-xl font-bold text-white">Gelişmiş 3D Kutu Mockup</h3>
            <p className="text-xs text-slate-400">Yüklenen diecut görselinden 3D model simüle ediliyor.</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-white text-xl"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-grow flex items-center justify-center perspective-container overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black">
          <style>{`
            .perspective-container {
              perspective: 1500px;
            }
            .box-3d {
              width: 300px;
              height: 400px;
              position: relative;
              transform-style: preserve-3d;
              animation: rotateBox 15s infinite linear;
              cursor: grab;
            }
            .box-3d:active {
              cursor: grabbing;
              animation-play-state: paused;
            }
            .box-face {
              position: absolute;
              background-color: white;
              background-image: url('${imageUrl}');
              background-size: 400% 300%; /* 4 columns, 3 rows */
              border: 1px solid rgba(0,0,0,0.1);
              backface-visibility: visible;
              box-shadow: inset 0 0 100px rgba(0,0,0,0.1);
            }

            /* Face Slicing logic (x, y) */
            /* Row 1: x=0 25 50 75, y=0 50 100 */

            .face-front  { 
              width: 300px; height: 400px; 
              transform: rotateY(0deg) translateZ(100px);
              background-position: 33.33% 50%; /* Col 1, Row 1 */
            }
            .face-back   { 
              width: 300px; height: 400px; 
              transform: rotateY(180deg) translateZ(100px);
              background-position: 100% 50%; /* Col 3, Row 1 */
            }
            .face-right  { 
              width: 200px; height: 400px; 
              transform: rotateY(90deg) translateZ(200px); 
              left: 50px;
              background-position: 66.66% 50%; /* Col 2, Row 1 */
            }
            .face-left   { 
              width: 200px; height: 400px; 
              transform: rotateY(-90deg) translateZ(100px); 
              left: 50px;
              background-position: 0% 50%; /* Col 0, Row 1 */
            }
            .face-top    { 
              width: 300px; height: 200px; 
              transform: rotateX(90deg) translateZ(100px); 
              top: 100px;
              background-position: 33.33% 0%; /* Col 1, Row 0 */
            }
            .face-bottom { 
              width: 300px; height: 200px; 
              transform: rotateX(-90deg) translateZ(300px); 
              top: 100px;
              background-position: 33.33% 100%; /* Col 1, Row 2 */
            }
            
            @keyframes rotateBox {
              0% { transform: rotateX(-15deg) rotateY(0deg); }
              100% { transform: rotateX(-15deg) rotateY(360deg); }
            }

            .box-3d:hover {
              animation-play-state: paused;
            }
          `}</style>
          
          <div className="box-3d">
            <div className="box-face face-front"></div>
            <div className="box-face face-back"></div>
            <div className="box-face face-right"></div>
            <div className="box-face face-left"></div>
            <div className="box-face face-top"></div>
            <div className="box-face face-bottom"></div>
          </div>
        </div>
        
        <div className="p-6 bg-slate-800/80 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
             <div className="w-24 h-16 bg-white/5 rounded border border-white/20 overflow-hidden">
                <img src={imageUrl} alt="Diecut Source" className="w-full h-full object-contain" />
             </div>
             <div>
                <p className="text-white font-medium text-sm">Kaynak Açınım Görseli</p>
                <p className="text-slate-400 text-xs">4x3 Haç tipi şablon otomatik olarak uygulandı.</p>
             </div>
          </div>
          <div className="flex gap-2">
             <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-blue-500/30">Etkileşimli 3D</div>
             <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-500/30">CSS Dilimleme</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoxMockup3D;

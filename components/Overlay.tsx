
import React from 'react';
import { ParticleShape, AppState } from '../types';

interface OverlayProps {
  appState: AppState;
  currentShape: ParticleShape;
  onStart: () => void;
  errorMsg?: string;
}

export const Overlay: React.FC<OverlayProps> = ({ appState, currentShape, onStart, errorMsg }) => {
  const isExploded = currentShape === ParticleShape.EXPLODE;

  if (appState === AppState.IDLE || appState === AppState.LOADING) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-center p-4">
        <h1 className="text-3xl md:text-5xl font-serif text-yellow-500 mb-8 tracking-widest uppercase flex items-center justify-center gap-2">
          <span>Holiday Greetings from Kite</span>
        </h1>
        
        {appState === AppState.LOADING ? (
           <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <button 
            onClick={onStart}
            className="px-8 py-3 bg-red-700 hover:bg-red-600 text-white font-bold rounded-none border border-yellow-500 transition-all duration-300 uppercase tracking-wider"
          >
            Start Experience
          </button>
        )}
        {errorMsg && <p className="mt-4 text-red-500">{errorMsg}</p>}
      </div>
    );
  }

  return (
    <div className={`absolute top-0 left-0 w-full z-40 p-4 pointer-events-none transition-all duration-700 ease-in-out ${
      isExploded ? 'opacity-0 -translate-y-10' : 'opacity-100 translate-y-0'
    }`}>
      <div className="flex flex-col items-center">
        <div className="bg-black/50 backdrop-blur-md border-b border-yellow-500/50 px-8 py-4 rounded-lg flex flex-col items-center">
           <h2 className="text-xl md:text-2xl text-yellow-500 font-serif tracking-widest text-center uppercase flex items-center justify-center gap-2">
             <span>Holiday Greetings from Kite</span>
           </h2>
        </div>
      </div>
    </div>
  );
};

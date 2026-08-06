import { useState, useEffect } from 'react';
import Game3D from './components/Game3D';
import { Mic, Music, Music4, Bot, Clock, Dog, Settings, Store, Trophy } from 'lucide-react';
import { playBGM, stopBGM } from './lib/sounds';
import { loadUserData, saveUserData, UserData } from './lib/store';

export type GameMode = 'FREE_ROAM' | 'TIME_ATTACK' | 'SURVIVAL';
export type Weather = 'day' | 'night' | 'rain';

type GameState = 'START' | 'PLAYING' | 'SHOP' | 'SETTINGS';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [musicOn, setMusicOn] = useState(false);
  const [botMode, setBotMode] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('FREE_ROAM');
  const [weather, setWeather] = useState<Weather>('day');
  
  const [userData, setUserData] = useState<UserData>(loadUserData());

  useEffect(() => {
    saveUserData(userData);
  }, [userData]);

  useEffect(() => {
    if (musicOn) {
      playBGM(weather);
    } else {
      stopBGM();
    }
    return () => stopBGM();
  }, [musicOn, weather]);

  const startGame = async (mode: GameMode) => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setGameMode(mode);
      setGameState('PLAYING');
      setMusicOn(true);
    } catch (err) {
      alert("Akses mikrofon diperlukan untuk permainan ini. Sila benarkan akses pada browser anda.");
    }
  };

  const buyColor = (color: string, price: number) => {
    if (userData.coins >= price && !userData.unlockedColors.includes(color)) {
      setUserData(prev => ({
        ...prev,
        coins: prev.coins - price,
        unlockedColors: [...prev.unlockedColors, color]
      }));
    }
  };

  const equipColor = (color: string) => {
    if (userData.unlockedColors.includes(color)) {
      setUserData(prev => ({ ...prev, equippedColor: color }));
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center font-sans p-4 md:p-8 transition-colors duration-1000 ${weather === 'night' ? 'bg-slate-900' : weather === 'rain' ? 'bg-slate-300' : 'bg-[#fffbeb]'}`}>
      
      {gameState === 'PLAYING' && (
        <div className="w-full max-w-6xl flex justify-end mb-4">
          <button 
            onClick={() => setMusicOn(!musicOn)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all shadow-sm border ${
              musicOn 
                ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200' 
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {musicOn ? <Music size={16} /> : <Music4 size={16} />}
            {musicOn ? 'Muzik: Hidup' : 'Muzik: Mati'}
          </button>
        </div>
      )}

      <div className={`w-full max-w-6xl h-[88dvh] md:h-[85vh] min-h-[520px] bg-white rounded-[2rem] shadow-2xl overflow-hidden relative border-4 flex flex-col transition-colors duration-1000 ${weather === 'night' ? 'border-indigo-900 bg-slate-800' : 'border-amber-100 bg-white'}`}>
        
        {/* --- MAIN MENU --- */}
        {gameState === 'START' && (
          <div className="absolute inset-0 flex flex-col items-center justify-start md:justify-center bg-gradient-to-b from-amber-50 to-amber-200 px-4 pt-20 pb-8 md:p-8 text-center z-10 overflow-y-auto">
            
            <div className="absolute top-4 right-4 md:top-6 md:right-6 flex gap-2 md:gap-4">
               <div className="bg-white/80 px-4 py-2 rounded-xl font-black text-amber-600 shadow-sm border border-amber-100 flex items-center gap-2">
                 <span>💰</span> {userData.coins}
               </div>
               <button onClick={() => setGameState('SHOP')} className="bg-amber-100 text-amber-700 p-2 rounded-xl shadow-sm border border-amber-200 hover:bg-amber-200 transition-colors">
                 <Store size={24} />
               </button>
               <button onClick={() => setGameState('SETTINGS')} className="bg-slate-100 text-slate-700 p-2 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-200 transition-colors">
                 <Settings size={24} />
               </button>
            </div>

            <div className="text-7xl md:text-9xl mb-4 animate-bounce drop-shadow-xl">🐈</div>
            <h1 className="text-5xl md:text-6xl font-black text-amber-800 drop-shadow-sm mb-2 tracking-tight">KucingMe</h1>
            <p className="text-amber-700 font-bold mb-8 text-lg">Kawal dengan Suara Anda!</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mb-8">
              {/* Free Roam */}
              <div className="bg-white/80 p-6 rounded-3xl border border-white shadow-xl flex flex-col items-center hover:scale-105 transition-transform cursor-pointer" onClick={() => startGame('FREE_ROAM')}>
                 <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4"><Mic size={32} /></div>
                 <h3 className="text-xl font-black text-amber-900 mb-2">Bebas Jalan</h3>
                 <p className="text-sm text-amber-700/80 font-medium text-center">Jalan bebas kumpul makanan. Boleh aktifkan bot untuk berlumba.</p>
                 <div className="mt-4 w-full" onClick={(e) => e.stopPropagation()}>
                    <label className="flex items-center justify-center gap-2 cursor-pointer bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 hover:bg-amber-100 transition-colors">
                      <input type="checkbox" checked={botMode} onChange={(e) => setBotMode(e.target.checked)} className="w-4 h-4 text-amber-600 rounded" />
                      <span className="font-bold text-amber-900 text-sm flex items-center gap-1"><Bot size={16}/> Lawan Bot</span>
                    </label>
                 </div>
              </div>

              {/* Time Attack */}
              <div className="bg-white/80 p-6 rounded-3xl border border-white shadow-xl flex flex-col items-center hover:scale-105 transition-transform cursor-pointer" onClick={() => startGame('TIME_ATTACK')}>
                 <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4"><Clock size={32} /></div>
                 <h3 className="text-xl font-black text-blue-900 mb-2">Masa Terhad</h3>
                 <p className="text-sm text-blue-700/80 font-medium text-center">Kumpul makanan terbanyak dalam 60 saat!</p>
                 <div className="mt-auto pt-4 text-xs font-black text-blue-600 flex items-center gap-1">
                   <Trophy size={14} /> Rekod: {userData.highscores.timeAttack}
                 </div>
              </div>

              {/* Survival */}
              <div className="bg-white/80 p-6 rounded-3xl border border-white shadow-xl flex flex-col items-center hover:scale-105 transition-transform cursor-pointer" onClick={() => startGame('SURVIVAL')}>
                 <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><Dog size={32} /></div>
                 <h3 className="text-xl font-black text-red-900 mb-2">Dikejar Anjing!</h3>
                 <p className="text-sm text-red-700/80 font-medium text-center">Lari dari anjing selama yang boleh. Hati-hati!</p>
                 <div className="mt-auto pt-4 text-xs font-black text-red-600 flex items-center gap-1">
                   <Trophy size={14} /> Rekod: {userData.highscores.survival}s
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* --- SHOP --- */}
        {gameState === 'SHOP' && (
          <div className="absolute inset-0 bg-amber-50 p-8 overflow-y-auto z-20">
             <div className="max-w-4xl mx-auto">
               <div className="flex justify-between items-center mb-8">
                 <h2 className="text-4xl font-black text-amber-900">Kedai Kucing</h2>
                 <div className="flex items-center gap-4">
                   <div className="bg-white px-6 py-3 rounded-2xl font-black text-amber-600 shadow-sm border border-amber-200 text-xl flex items-center gap-2">
                     <span>💰</span> {userData.coins}
                   </div>
                   <button onClick={() => setGameState('START')} className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold shadow-sm hover:bg-slate-700">Kembali</button>
                 </div>
               </div>

               <h3 className="text-2xl font-bold text-amber-800 mb-4">Warna Kucing</h3>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {[
                   { id: '#f59e0b', name: 'Oren Biasa', price: 0 },
                   { id: '#334155', name: 'Kelabu Gelap', price: 50 },
                   { id: '#ffffff', name: 'Putih Salju', price: 100 },
                   { id: '#000000', name: 'Hitam Misteri', price: 150 },
                   { id: '#ec4899', name: 'Merah Jambu', price: 300 },
                 ].map(item => {
                   const isUnlocked = userData.unlockedColors.includes(item.id);
                   const isEquipped = userData.equippedColor === item.id;
                   
                   return (
                     <div key={item.id} className={`bg-white p-4 rounded-3xl border-4 ${isEquipped ? 'border-green-500' : 'border-transparent'} shadow-sm flex flex-col items-center gap-3`}>
                       <div className="w-16 h-16 rounded-full shadow-inner border-2 border-slate-100" style={{ backgroundColor: item.id }}></div>
                       <div className="text-center">
                         <div className="font-bold text-slate-800">{item.name}</div>
                         {!isUnlocked && <div className="text-sm font-black text-amber-500 flex items-center justify-center gap-1"><span>💰</span> {item.price}</div>}
                       </div>
                       {isEquipped ? (
                         <div className="bg-green-100 text-green-700 font-bold px-4 py-2 rounded-xl text-sm w-full text-center">Dipakai</div>
                       ) : isUnlocked ? (
                         <button onClick={() => equipColor(item.id)} className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold px-4 py-2 rounded-xl text-sm w-full transition-colors">Pakai</button>
                       ) : (
                         <button onClick={() => buyColor(item.id, item.price)} disabled={userData.coins < item.price} className={`font-bold px-4 py-2 rounded-xl text-sm w-full transition-colors ${userData.coins >= item.price ? 'bg-amber-500 hover:bg-amber-400 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>Beli</button>
                       )}
                     </div>
                   );
                 })}
               </div>
             </div>
          </div>
        )}

        {/* --- SETTINGS --- */}
        {gameState === 'SETTINGS' && (
          <div className="absolute inset-0 bg-slate-50 p-8 overflow-y-auto z-20 flex items-center justify-center">
             <div className="w-full max-w-lg bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200">
               <div className="flex justify-between items-center mb-8">
                 <h2 className="text-3xl font-black text-slate-800">Tetapan</h2>
                 <button onClick={() => setGameState('START')} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold hover:bg-slate-300 transition-colors">Tutup</button>
               </div>
               
               <div className="mb-6">
                 <h3 className="text-lg font-bold text-slate-700 mb-3">Cuaca & Suasana</h3>
                 <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setWeather('day')} className={`p-4 rounded-2xl font-bold border-2 transition-colors ${weather === 'day' ? 'bg-sky-100 border-sky-400 text-sky-800' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'}`}>☀️ Siang</button>
                    <button onClick={() => setWeather('night')} className={`p-4 rounded-2xl font-bold border-2 transition-colors ${weather === 'night' ? 'bg-indigo-100 border-indigo-400 text-indigo-800' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'}`}>🌙 Malam</button>
                    <button onClick={() => setWeather('rain')} className={`p-4 rounded-2xl font-bold border-2 transition-colors ${weather === 'rain' ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'}`}>🌧️ Hujan</button>
                 </div>
               </div>
             </div>
          </div>
        )}

        {/* --- PLAYING --- */}
        {gameState === 'PLAYING' && (
          <Game3D 
            mode={gameMode}
            botMode={botMode} 
            weather={weather}
            userData={userData}
            setUserData={setUserData}
            onHome={() => {
              setGameState('START');
              setMusicOn(false);
            }} 
          />
        )}
      </div>
      
      {gameState === 'START' && (
        <footer className="mt-8 text-center">
          <p className={`text-sm font-medium transition-colors ${weather === 'night' ? 'text-slate-400' : 'text-amber-700/60'}`}>
            Nota: Memerlukan browser yang menyokong Web Speech API (seperti Google Chrome atau Edge).<br/>
            Pastikan mikrofon dibenarkan. "Lompat" dan "Lari" boleh digunakan!
          </p>
          <p className={`mt-4 text-xs font-bold transition-colors ${weather === 'night' ? 'text-slate-500' : 'text-amber-800/70'}`}>
            Dibangunkan Sepenuhnya Oleh Akmal Marvis<br/>
            © {new Date().getFullYear()} KucingMe · Kuala Lumpur, Malaysia
          </p>
        </footer>
      )}
    </div>
  );
}


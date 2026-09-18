'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import s from './interview.module.css';

export function DeviceCheck() {
 const [status,setStatus] = useState('尚未检查');
 const [deviceName,setDeviceName] = useState('默认麦克风');
 const [connected,setConnected] = useState(false);
 const [soundPlayed,setSoundPlayed] = useState(false);
 const [level,setLevel] = useState(0);
 const generation = useRef(0);
 const cleanup = useRef<() => void>(() => {});
 useEffect(() => () => { generation.current++; cleanup.current(); }, []);
 async function check() {
  const attempt = ++generation.current;
  cleanup.current();
  setStatus('正在请求麦克风权限…');
  try {
   if(!navigator.mediaDevices?.getUserMedia) throw new Error('unavailable');
   const stream = await navigator.mediaDevices.getUserMedia({audio:true});
   if (attempt !== generation.current) { stream.getTracks().forEach(t => t.stop()); return; }
   setDeviceName(stream.getAudioTracks()[0]?.label || '默认麦克风');
   setConnected(true);
   const context = new AudioContext();
   const analyzer = context.createAnalyser(); analyzer.fftSize=256;
   context.createMediaStreamSource(stream).connect(analyzer);
   const bytes = new Uint8Array(analyzer.frequencyBinCount);
   const timer = window.setInterval(() => { analyzer.getByteFrequencyData(bytes); setLevel(Math.min(10,Math.ceil(bytes.reduce((a,b) => a+b,0)/bytes.length/6))); },100);
   let stopped = false;
   cleanup.current = () => { if (stopped) return; stopped = true; clearInterval(timer); clearTimeout(stopTimer); stream.getTracks().forEach(t => t.stop()); void context.close().catch(() => {}); };
   setStatus('已连接 · 请说一句话');
   const stopTimer = setTimeout(() => { cleanup.current(); setLevel(0); setStatus('检查完成'); },8000);
  } catch { if (attempt !== generation.current) return; setStatus('无法使用麦克风，请检查权限或切换文字面试'); }
 }
 function sound() {
  setSoundPlayed(true);
  const context = new AudioContext(); const oscillator=context.createOscillator(); const gain=context.createGain();
  oscillator.connect(gain); gain.connect(context.destination); gain.gain.value=.08; oscillator.frequency.value=440; oscillator.start(); oscillator.stop(context.currentTime+.35); oscillator.onended=() => void context.close().catch(() => {});
 }
 return <div className={s.deviceBlock}><h2>设备检查</h2><p className={s.hint}>请检查并测试您的音频设备，确保可以正常进行语音面试。</p>
   <div className={s.deviceRow}><label>麦克风</label><div><span className={s.deviceName}>{deviceName}</span><span className={s.deviceStatus} data-connected={connected}>{connected ? '● 已连接' : '未检查'}</span><span className={s.deviceMeter} aria-label={`输入音量 ${level}`}>{Array.from({length:10},(_,i)=><i key={i} data-on={i<level}/>)}</span><Button variant="outline" onClick={() => void check()}><Mic size={16}/>试说一句</Button></div></div>
   <p role="status" className="mt-2 text-xs text-muted-foreground">{status}</p>
   <div className={s.deviceRow}><label>扬声器</label><div><span className={s.deviceName}>系统默认扬声器</span><span className={s.deviceStatus} data-connected={soundPlayed}>{soundPlayed ? '已播放' : '待试听'}</span><Button variant="outline" onClick={sound}><Volume2 size={16}/>播放测试音</Button></div></div><p className={`${s.hint} mt-8`}>ⓘ 麦克风不可用时，可切换文字面试。音频设备跟随浏览器和系统设置。</p>
 </div>;
}

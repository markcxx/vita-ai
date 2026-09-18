import { useId } from 'react';

/** Decorative scene drawn for the interview workspace, independent of report charts. */
export function InterviewArt({ documents = false }: { documents?: boolean }) {
  const id = useId();
  return <svg aria-hidden="true" viewBox={documents ? '0 0 500 760' : '0 0 1400 240'} preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
    <defs><linearGradient id={id}><stop stopColor="#eaf7ff"/><stop offset="1" stopColor="#ecfbf6"/></linearGradient></defs>
    <rect width="1400" height="900" fill={`url(#${id})`}/>
    {documents ? <>
      <ellipse cx="350" cy="405" rx="160" ry="190" fill="#fff3bd" transform="rotate(28 350 405)"/>
      <path d="M270 490 Q470 285 550 355 L550 700 L130 650Z" fill="#ffe8ee"/>
      <g transform="translate(90 305) rotate(-14 100 140)"><Paper/></g><g transform="translate(280 333) rotate(13 80 140)"><Paper/></g><g transform="translate(190 273) rotate(5 85 140)"><Paper/></g>
      <path d="M0 625 Q100 572 280 638 T500 620 V760 H0Z" fill="#ccf3e8" opacity=".8"/><path d="M0 640 Q130 593 280 651 T500 636" fill="none" stroke="white" strokeWidth="3"/>
      <path d="M52 242 L145 265 L105 280 L94 298Z" fill="#a7d6ff"/><path d="M52 242 L105 280 L145 265 L93 270Z" fill="#c7e8ff"/>
      <path d="M75 285 C-5 320 150 375 100 410" fill="none" stroke="#b8dfff" strokeWidth="2" strokeDasharray="6 7"/>
    </> : <>
      <ellipse cx="1110" cy="190" rx="220" ry="160" fill="#fff6cf" transform="rotate(-15 1110 190)"/>
      <path d="M1100 240 Q1270 30 1410 30 L1450 250Z" fill="#ffe8f0"/>
      <path d="M0 130 Q230 245 570 165 T1030 164 T1450 160 V270 H0Z" fill="#dff2ff"/>
      <path d="M0 213 Q200 139 460 218 T950 176 T1400 176 V250 H0Z" fill="#d7f5ef"/>
      <path d="M0 224 Q300 151 520 222 T1020 187 T1400 203" fill="none" stroke="white" strokeWidth="3"/>
      <path d="M1050 65 L1135 83 L1095 102 L1082 115Z" fill="#b3dcff"/><path d="M1050 65 L1095 102 L1135 83 L1080 89Z" fill="#d8edff"/>
      <path d="M1350 12 Q1320 58 1298 75 Q1295 30 1350 12 M1240 116 Q1280 114 1300 152 Q1260 150 1240 116" fill="#b6eadb" opacity=".65"/>
    </>}
  </svg>;
}
function Paper() {
  return <g><rect width="178" height="254" rx="2" fill="white" style={{filter:'drop-shadow(0 8px 12px #accde433)'}}/><circle cx="38" cy="35" r="19" fill="#b8dcff"/>{[0,1,2].map(i=><rect key={i} x="72" y={20+i*12} width={i===2?63:84} height="5" fill="#e0eaf3"/>)}{[0,1,2].map(i=><g key={i} transform={`translate(18 ${74+i*57})`}><rect width="42" height="6" fill={i===1?'#b8dcff':'#f9e7ad'}/>{[0,1,2].map(j=><rect key={j} y={14+j*9} width={j===2?102:142} height="4" fill="#e8eff5"/>)}</g>)}</g>;
}

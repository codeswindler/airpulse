'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Signal, Wifi, Battery, Phone, Delete } from 'lucide-react';

type UssdState = 'IDLE' | 'DIALPAD' | 'MENU_LOADING' | 'PROMPT_ACTIVE' | 'END_MESSAGE';

export default function UssdSimulator() {
  const [state, setState] = useState<UssdState>('IDLE');
  const [dialString, setDialString] = useState('*144#');
  const [menuText, setMenuText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [sessionData, setSessionData] = useState<any>({ targetPhone: '254712345678', amount: null });

  // Pure Sandbox State Machine logic (Mirrors the lib/ussdEngine.ts logic)
  const processInput = (input: string) => {
    if (input === '00') {
      setMenuText(`Buy Credo Bila Charges!\nAirtel, Safaricom & Telkom\nBuy for:\n1. My Number\n2. Other number\n3. Saved Numbers\n4. Exit`);
      setHistory(['MAIN_MENU']);
      setState('PROMPT_ACTIVE');
      return;
    }

    if (state === 'IDLE' || state === 'DIALPAD') {
      if (input === '*144#' || input === '*123#') {
        setState('PROMPT_ACTIVE');
        setMenuText(`Buy Credo Bila Charges!\nAirtel, Safaricom & Telkom\nBuy for:\n1. My Number\n2. Other number\n3. Saved Numbers\n4. Exit`);
        setHistory(['MAIN_MENU']);
      }
      return;
    }

    const currentMenu = history[history.length - 1];

    if (currentMenu === 'MAIN_MENU') {
      if (input === '1') {
        setMenuText('Enter your amount (Min:5, Max:5000)');
        setHistory([...history, 'ENTER_AMOUNT_MY_NUMBER']);
      } else if (input === '2') {
        setMenuText('Enter number you wish to receive amount');
        setHistory([...history, 'ENTER_OTHER_NUMBER']);
      } else if (input === '3') {
        setMenuText('Saved Numbers:\n1. 254700000001\n2. 254700000002');
        setHistory([...history, 'SHOW_SAVED_NUMBERS']);
      } else {
        setState('IDLE');
      }
    } else if (currentMenu === 'ENTER_AMOUNT_MY_NUMBER' || currentMenu === 'ENTER_AMOUNT_OTHER_NUMBER' || currentMenu === 'ENTER_AMOUNT_SAVED_NUMBER') {
      const amt = parseFloat(input);
      if (isNaN(amt) || amt < 5) {
        setMenuText('Invalid amount. Enter your amount (Min:5, Max:5000)');
      } else {
        setSessionData({ ...sessionData, amount: amt });
        setMenuText(`You are about to purchase Ksh. ${amt} airtime for ${sessionData.targetPhone}. Confirm to continue\n1. CONFIRM\n2. CANCEL`);
        setHistory([...history, 'CONFIRM_PURCHASE']);
      }
    } else if (currentMenu === 'ENTER_OTHER_NUMBER') {
      setSessionData({ ...sessionData, targetPhone: input });
      setMenuText('Do you want to save this number?\n1. Save number\n2. Proceed to purchase');
      setHistory([...history, 'SAVE_NUMBER_PROMPT']);
    } else if (currentMenu === 'SAVE_NUMBER_PROMPT') {
      setMenuText('Enter your amount (Min:5, Max:5000)');
      setHistory([...history, 'ENTER_AMOUNT_OTHER_NUMBER']);
    } else if (currentMenu === 'CONFIRM_PURCHASE') {
       if (input === '1') {
         setMenuText('We are processing your request. Please enter your PIN on the pop-up to complete your purchase.');
         setState('END_MESSAGE');
       } else {
         setState('IDLE');
       }
    }
  };

  const handleAction = () => {
    processInput(userInput);
    setUserInput('');
  };

  return (
    <div className="simulator-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px' }}>
      
      {/* Realistic Phone Frame */}
      <div className="iphone-frame" style={{
        width: '280px',
        height: '580px',
        backgroundColor: '#111',
        borderRadius: '40px',
        border: '7px solid #333',
        boxShadow: `
          0 20px 40px -10px rgba(0, 0, 0, 0.7),
          inset 0 0 2px 1px rgba(255, 255, 255, 0.1),
          0 0 0 1px rgba(255, 255, 255, 0.05)
        `,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        overflow: 'visible'
      }}>

        {/* Physical Buttons */}
        <div style={{ position: 'absolute', left: '-9px', top: '80px', width: '3px', height: '20px', backgroundColor: '#333', borderRadius: '2px 0 0 2px' }}></div>
        <div style={{ position: 'absolute', left: '-9px', top: '120px', width: '3px', height: '40px', backgroundColor: '#333', borderRadius: '2px 0 0 2px' }}></div>
        <div style={{ position: 'absolute', left: '-9px', top: '170px', width: '3px', height: '40px', backgroundColor: '#333', borderRadius: '2px 0 0 2px' }}></div>
        <div style={{ position: 'absolute', right: '-9px', top: '140px', width: '3px', height: '60px', backgroundColor: '#333', borderRadius: '0 2px 2px 0' }}></div>
        
        {/* iPhone Screen Content */}
        <div className="iphone-screen" style={{
          flex: 1,
          backgroundColor: state === 'IDLE' ? '#000' : '#050505',
          margin: '4px',
          borderRadius: '34px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          transition: 'background-color 0.3s'
        }}>
          
          {/* Dynamic Island */}
          <div style={{
            width: '85px',
            height: '24px',
            backgroundColor: '#000',
            borderRadius: '12px',
            margin: '8px auto 0',
            zIndex: 100,
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 4px rgba(255,255,255,0.1)'
          }}>
             <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'radial-gradient(circle, #1a1a40 0%, #000 70%)', position: 'absolute', right: '15px' }}></div>
          </div>

          {/* Status Bar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '8px 22px', 
            fontSize: '11px', 
            color: '#fff',
            fontWeight: 600,
            opacity: 0.9,
            width: '100%',
            zIndex: 90,
            position: 'absolute',
            top: 0
          }}>
            <div>9:41</div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <Signal size={12} />
              <Wifi size={12} />
              <Battery size={12} strokeWidth={2.5} />
            </div>
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 40 }}>
            {state === 'IDLE' && (
              <div 
                onClick={() => setState('DIALPAD')}
                style={{ cursor: 'pointer', textAlign: 'center', opacity: 0.8 }}
              >
                <div style={{ fontSize: '40px', color: '#fff', fontWeight: 200, marginBottom: 10 }}></div>
                <p style={{ color: '#888', fontSize: '11px' }}>Tap to wake</p>
              </div>
            )}

            {state === 'DIALPAD' && (
               <div style={{ width: '100%', padding: '15px', textAlign: 'center', display: 'flex', flexDirection: 'column', height: '100%' }}>
                 <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80px' }}>
                   <input 
                     value={dialString}
                     readOnly
                     style={{ width: '100%', border: 'none', background: 'transparent', color: '#fff', fontSize: '36px', textAlign: 'center', outline: 'none', fontWeight: 300, letterSpacing: '1px' }}
                   />
                   <button style={{ color: '#007aff', background: 'none', border: 'none', fontSize: '13px', marginTop: 4, cursor: 'pointer' }}>Add to Contacts</button>
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 18px', padding: '0 5px', marginBottom: 20 }}>
                   {[
                     { n: '1', l: '' }, { n: '2', l: 'A B C' }, { n: '3', l: 'D E F' },
                     { n: '4', l: 'G H I' }, { n: '5', l: 'J K L' }, { n: '6', l: 'M N O' },
                     { n: '7', l: 'P Q R S' }, { n: '8', l: 'T U V' }, { n: '9', l: 'W X Y Z' },
                     { n: '*', l: '' }, { n: '0', l: '+' }, { n: '#', l: '' }
                   ].map(item => (
                     <div 
                      key={item.n} 
                      onClick={() => setDialString(dialString + item.n)}
                      style={{ 
                        height: '60px', 
                        width: '60px', 
                        borderRadius: '50%', 
                        backgroundColor: '#222', 
                        color: '#fff', 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        cursor: 'pointer',
                        transition: 'transform 0.1s, background-color 0.1s',
                        margin: '0 auto'
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.backgroundColor = '#444';
                        e.currentTarget.style.transform = 'scale(0.95)';
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.backgroundColor = '#222';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                     >
                       <span style={{ fontSize: '26px', fontWeight: 400, lineHeight: 1 }}>{item.n}</span>
                       {item.l && <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginTop: 1, letterSpacing: 0.5 }}>{item.l}</span>}
                     </div>
                   ))}
                 </div>

                 <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 25, padding: '0 10px' }}>
                   <div style={{ width: '60px' }}></div>
                   <button 
                     onClick={() => processInput(dialString)}
                     style={{ 
                       width: '60px', 
                       height: '60px', 
                       borderRadius: '50%', 
                       backgroundColor: '#34c759', 
                       border: 'none', 
                       color: '#fff', 
                       display: 'flex', 
                       alignItems: 'center', 
                       justifyContent: 'center', 
                       cursor: 'pointer',
                       boxShadow: '0 4px 10px rgba(52, 199, 89, 0.3)' 
                     }}
                   >
                     <Phone size={26} fill="white" />
                   </button>
                   <button 
                     onClick={() => setDialString(dialString.slice(0, -1))}
                     style={{ 
                       width: '60px', 
                       height: '60px', 
                       display: 'flex', 
                       alignItems: 'center', 
                       justifyContent: 'center', 
                       background: 'none', 
                       border: 'none', 
                       color: 'rgba(255,255,255,0.4)', 
                       cursor: 'pointer',
                       visibility: dialString.length > 0 ? 'visible' : 'hidden'
                     }}
                   >
                     <Delete size={22} />
                   </button>
                 </div>
               </div>
            )}

            {state === 'PROMPT_ACTIVE' && (
              <div style={{
                width: '240px',
                backgroundColor: '#fff',
                borderRadius: '14px',
                padding: '16px',
                boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
                color: '#000',
                zIndex: 120
              }}>
                <p style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.5', marginBottom: 15, fontWeight: 500 }}>{menuText}</p>
                <input 
                  autoFocus
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAction()}
                  style={{ width: '100%', padding: '8px 0', border: 'none', borderBottom: '1.5px solid #007aff', outline: 'none', marginBottom: 16, fontSize: '16px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button 
                    onClick={() => setState('IDLE')}
                    style={{ background: 'none', border: 'none', color: '#007aff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAction}
                    style={{ background: 'none', border: 'none', color: '#007aff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                  >
                    Send
                  </button>
                </div>
              </div>
            )}

            {state === 'END_MESSAGE' && (
              <div style={{
                 width: '220px',
                 backgroundColor: 'rgba(255,255,255,0.95)',
                 borderRadius: '14px',
                 padding: '20px',
                 textAlign: 'center',
                 color: '#000',
                 boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
              }}>
                 <p style={{ fontSize: '13px', marginBottom: 16, lineHeight: 1.4 }}>{menuText}</p>
                 <button 
                  onClick={() => setState('IDLE')}
                  style={{ backgroundColor: '#007aff', color: '#fff', border: 'none', padding: '8px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                 >
                   Dismiss
                 </button>
              </div>
            )}
          </div>

          {/* Home Indicator */}
          <div style={{
            width: '100px',
            height: '4px',
            backgroundColor: '#fff',
            borderRadius: '2px',
            margin: '0 auto 8px',
            opacity: 0.3,
            zIndex: 100
          }}></div>

        </div>
      </div>
    </div>
  );
}

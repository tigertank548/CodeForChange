import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { ElevenLabsClient, ElevenLabsEnvironment } from '@elevenlabs/elevenlabs-js';
import { Mic, HelpCircle, Play, Square, Settings, Upload, X, Globe, BookOpen, Sparkles } from 'lucide-react';
import gatorLogo from './assets/gatorreads-logo.png';

// --- IMPORT YOUR NEW COMPONENT ---
import ParentZone from './ParentZone';
import DefinitionModal from './DefinitionModal';

const SAMPLE_SENTENCE = "Hey Parent! Upload a text-based file to the settings in the upper right hand corner!";


function Reader() {
    // --- STATE MANAGEMENT ---
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [micVolume, setMicVolume] = useState(0);
    const [sourceType, setSourceType] = useState('manual');
    const [isRequestingNext, setIsRequestingNext] = useState(false); // New: Prevents double-firing
    const [definitionWord, setDefinitionWord] = useState(null);
    const [readerFont, setReaderFont] = useState('font-comic');

    // Parent Zone State
    const [showSettings, setShowSettings] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [textInput, setTextInput] = useState(''); // Added this back for ParentZone
    const [messages, setMessages] = useState([]);
    const [currentText, setCurrentText] = useState(SAMPLE_SENTENCE);

    // Derived state
    const paragraphs = currentText.split('\n').map(p => p.trim()).filter(p => p);
    const allWordsRaw = paragraphs.flatMap(p => p.split(/\s+/));
    const totalWordCount = allWordsRaw.length;

    // Track tool usage & transcripts
    const toolWasUsedRef = useRef(false);

    // Sync state to ref
    useEffect(() => {
    }, []);


    // --- 1. ELEVENLABS HOOK ---
    const conversation = useConversation({
        onConnect: () => console.log('Connected to Reader Agent'),
        onDisconnect: () => console.log('Disconnected'),

        // --- CLIENT TOOLS ---
        clientTools: {
            update_screen_text: (parameters) => {
                const newText = parameters.text;
                console.log("🛠️ Agent Tool Call:", newText);

                if (!newText || newText.includes("Chatting") || newText.length < 5) {
                    console.log("🚫 Ignoring placeholder.");
                    toolWasUsedRef.current = false;
                    return "Placeholder ignored.";
                }

                setCurrentText(newText);
                setSourceType('agent');
                setIsRequestingNext(false);
                toolWasUsedRef.current = true;
                return "Screen updated successfully.";
            }
        },

        // --- MESSAGE HANDLING ---
        onMessage: (message) => {
            if (message.type === 'agent_response') {
                setMessages(prev => [...prev, { type: 'agent', text: message.message }]);

                // Fallback Logic
                if (!toolWasUsedRef.current && message.message.length > 10) {
                    console.log("⚠️ Fallback: Using audio text");
                    setCurrentText(message.message);
                    setCurrentWordIndex(0);
                    setSourceType('agent');
                    setIsRequestingNext(false);
                }
                setTimeout(() => { toolWasUsedRef.current = false; }, 2000);
            }
            else if (message.type === 'user_transcript') {
                // REAL-TIME KARAOKE LOGIC
                // 1. Get the current target word we are looking for
                let currentIndex = wordIndexRef.current;

                // Safety check
                if (currentIndex >= allWordsRaw.length) return;

                const targetWordClean = allWordsRaw[currentIndex].toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");

                // 2. Clean the incoming transcript chunk
                const spokenChunk = message.message.toLowerCase();

                // 3. Check if the target word is inside this latest chunk
                if (spokenChunk.includes(targetWordClean)) {
                    console.log(`🎤 Matched word: ${targetWordClean}`);

                    // Move to next word!
                    const newIndex = currentIndex + 1;
                    setCurrentWordIndex(newIndex);
                }
            }
        },
        onError: (error) => console.error('Error:', error),
    });

    const isConnected = conversation.status === 'connected';
    const isSpeaking = conversation.isSpeaking;

    // --- AUTO-ADVANCE LOGIC ---
    useEffect(() => {
        // This is a placeholder for the auto-advance logic, which is currently disabled.
    }, [isConnected, isRequestingNext, isSpeaking, conversation]);


    // --- HANDLERS ---
    const handleStartStop = async () => {
        if (isConnected) {
            await conversation.endSession();
        } else {
            try {
                // Using Vercel Environment Variable
                await conversation.startSession({ agentId: import.meta.env.VITE_AGENT_ID, });
            } catch (error) {
                console.error('Failed to start:', error);
            }
        }
    };


    const handleStuck = async () => {
        if (!isConnected) return;
        console.log("🆘 I'm stuck clicked");
        await conversation.sendUserMessage("I am stuck. Please ask me exactly: 'What word do you need help with?'");
    };



    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
        setUploadStatus('');
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setUploadStatus('Uploading...');
        try {
            const content = await selectedFile.text();
            // Using Vercel Environment Variable
            const client = new ElevenLabsClient({
                apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
                environment: ElevenLabsEnvironment.Production,
            });
            await client.conversationalAi.knowledgeBase.documents.createFromText({
                text: content,
                name: selectedFile.name,
            });
            setCurrentText(content);
            setCurrentWordIndex(0);
            setSourceType('manual');
            setUploadStatus('Success!');
            setSelectedFile(null);
        } catch (error) {
            console.error(error);
            setUploadStatus('Failed.');
        }
    };

    const handleWordDoubleClick = (word) => {
        const cleanedWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
        setDefinitionWord(cleanedWord);
    };

    // --- VISUALIZER ---
    useEffect(() => {
        let interval;
        if (isConnected) interval = setInterval(() => setMicVolume(Math.random() * 100), 100);
        else setMicVolume(0);
        return () => clearInterval(interval);
    }, [isConnected]);

    return (
        <div className="flex flex-col min-h-screen bg-blue-50 p-4 md:p-6 lg:p-8 font-sans relative">

            {definitionWord && (
                <DefinitionModal
                    word={definitionWord}
                    onClose={() => setDefinitionWord(null)}
                />
            )}

            {/* --- PARENT SETTINGS MODAL --- */}
            <ParentZone
                showSettings={showSettings}
                setShowSettings={setShowSettings}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                uploadStatus={uploadStatus}
                setUploadStatus={setUploadStatus}
                textInput={textInput}
                setTextInput={setTextInput}
                handleUpload={handleUpload}
                readerFont={readerFont}
                setReaderFont={setReaderFont}
            />

            <img
                src={gatorLogo}
                alt="GatorReads Logo"
                className="absolute top-4 left-4 h-24 md:h-40 w-auto object-contain z-10"
            />
            {/* HEADER */}
            <header className="w-full flex justify-end items-center mb-4 md:mb-6 lg:mb-8 relative z-20">
                <button onClick={() => setShowSettings(true)} className="ml-4 p-3 bg-white rounded-full shadow-md hover:bg-gray-50 transition border border-blue-100 text-gray-400 hover:text-blue-500 cursor-pointer">
                    <Settings size={24} />
                </button>
            </header>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col items-center justify-center gap-4 md:gap-6 lg:gap-8 max-w-4xl mx-auto w-full">
                <div className="relative">
                    <AvatarDisplay isSpeaking={isSpeaking} isConnected={isConnected} sourceType={sourceType} />

                    {/* Source Badge */}
                    {isSpeaking && sourceType !== 'manual' && (
                        <div className={`absolute -right-32 top-8 px-3 py-1 rounded-full text-xs font-bold border shadow-sm animate-bounce ${sourceType === 'web' ? "bg-purple-100 text-purple-700 border-purple-200" :
                            sourceType === 'agent' ? "bg-yellow-100 text-yellow-700 border-yellow-200" : ""
                            }`}>
                            {sourceType === 'web' && <span className="flex items-center gap-1"><Globe size={12} /> Internet</span>}
                            {sourceType === 'agent' && <span className="flex items-center gap-1"><Sparkles size={12} /> AI Story</span>}
                        </div>
                    )}
                </div>

                {/* Reading Box */}
                <div className="bg-white p-4 md:p-6 lg:p-8 rounded-3xl shadow-xl border-4 border-blue-200 w-full text-center min-h-[200px] max-h-[300px] md:max-h-[400px] lg:max-h-[500px] overflow-y-auto flex flex-col justify-start pt-4 md:pt-6 lg:pt-8">
                    {(() => {
                        let wordIndex = 0;
                        return paragraphs.map((para, paraIndex) => {
                            const words = para.split(/\s+/);
                            const paraContent = words.map((word, i) => {
                                const globalIndex = wordIndex + i;
                                // 1. Define the color logic cleanly here, BEFORE the HTML
                                let colorClass = "text-gray-700"; // Default (Words not read yet)
                                if (globalIndex < currentWordIndex) {
                                    colorClass = "text-gray-400"; // Past words (Gray)
                                } else if (globalIndex === currentWordIndex) {
                                    colorClass = "bg-yellow-200 text-black underline scale-110 shadow-md"; // Current word (Highlight)
                                }
                                return (
                                    <span
                                        key={globalIndex}
                                        onDoubleClick={() => handleWordDoubleClick(word)}
                                        className={`px-2 py-1 rounded-lg transition-all duration-300 ease-in-out text-2xl md:text-4xl lg:text-5xl font-bold leading-relaxed cursor-pointer ${readerFont} text-gray-700`}>
                                        {word}
                                    </span>
                                );
                            });
                            wordIndex += words.length;
                            return <div key={paraIndex} className="flex flex-wrap justify-center gap-3 mb-8 pr-4">{paraContent}</div>;
                        });
                    })()}
                </div>

                {/* Visualizer */}
                <div className="h-12 flex items-end justify-center gap-1">
                    {isConnected ? [...Array(10)].map((_, i) => (
                        <div key={i} className="w-1 md:w-2 lg:w-3 bg-green-400 rounded-full transition-all duration-75" style={{ height: `${Math.max(15, Math.random() * micVolume)}%`, opacity: 0.8 }} />
                    )) : <div className="text-gray-300 font-bold tracking-widest text-sm">MIC OFF</div>}
                </div>
            </main>

            {/* CONTROLS */}
            <footer className="mt-8 flex justify-center gap-8 md:gap-12 w-full max-w-2xl mx-auto">
                <button onClick={handleStartStop} className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all font-bold border-b-4 text-white shadow-lg active:border-b-0 active:translate-y-1 cursor-pointer w-24 ${isConnected ? 'bg-red-500 border-red-700 hover:bg-red-600' : 'bg-green-500 border-green-700 hover:bg-green-600'}`}>
                    {isConnected ? <Square size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                    <span className="mt-1 text-sm md:text-base">{isConnected ? 'Stop' : 'Start'}</span>
                </button>

                <ControlButton icon={<HelpCircle size={28} />} label="I'm Stuck" color="orange" onClick={handleStuck} />
            </footer>
        </div>
    );
}

const AvatarDisplay = ({ isSpeaking, isConnected, sourceType }) => (
    <div className={`w-32 h-32 md:w-40 md:h-40 bg-white rounded-full flex items-center justify-center text-6xl md:text-7xl shadow-2xl border-4 ring-4 transition-transform hover:scale-105 ${isSpeaking && sourceType === 'web' ? 'border-purple-200 ring-purple-100' :
        isSpeaking && sourceType === 'agent' ? 'border-yellow-200 ring-yellow-100' :
            'border-white ring-blue-100'
        }`}>
        {!isConnected ? '🙂' : isSpeaking ? '🗣️' : '👂'}
    </div>
);

const ControlButton = ({ icon, label, color, onClick, className }) => {
    const colors = { orange: "bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-300" };
    return (
        <button onClick={onClick} className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-colors font-bold border-b-4 active:border-b-0 active:translate-y-1 cursor-pointer w-24 ${colors[color]} ${className || ''}`}>
            {icon}
            <span className="mt-1 text-sm md:text-base">{label}</span>
        </button>
    );
};

export default Reader;
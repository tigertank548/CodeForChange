import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { ElevenLabsClient, ElevenLabsEnvironment } from '@elevenlabs/elevenlabs-js';
import { Mic, HelpCircle, Play, Square, Settings, Upload, X, Globe, BookOpen, Sparkles } from 'lucide-react';
import { ELEVENLABS_API_KEY, AGENT_ID } from './config';
import ParentZone from './ParentZone';

const SAMPLE_SENTENCE = "Hey Parent! Upload a text-based file to the settings in the upper right hand corner!";


function Reader() {
    // --- STATE MANAGEMENT ---
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [micVolume, setMicVolume] = useState(0);
    const [progress, setProgress] = useState(0);
    const [sourceType, setSourceType] = useState('manual');
    const [isRequestingNext, setIsRequestingNext] = useState(false); // New: Prevents double-firing

    const [showSettings, setShowSettings] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [messages, setMessages] = useState([]);
    const [currentText, setCurrentText] = useState(SAMPLE_SENTENCE);

    // Derived state
    const paragraphs = currentText.split('\n').map(p => p.trim()).filter(p => p);
    const allWordsRaw = paragraphs.flatMap(p => p.split());
    const totalWordCount = allWordsRaw.length;

    // Track tool usage
    const toolWasUsedRef = useRef(false);

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

                // New text arrived! Reset everything.
                setCurrentText(newText);
                setCurrentWordIndex(0);
                setProgress(0);
                setSourceType('agent');
                setIsRequestingNext(false); // Reset auto-advance lock
                toolWasUsedRef.current = true;
                return "Screen updated successfully.";
            }
        },

        // --- MESSAGE HANDLING ---
        onMessage: (message) => {
            if (message.type === 'agent_response') {
                setMessages(prev => [...prev, { type: 'agent', text: message.message }]);

                // Fallback Logic
                if (!toolWasUsedRef.current) {
                    // Only fallback if message is substantial
                    if (message.message.length > 10) {
                        console.log("⚠️ Fallback: Using audio text");
                        setCurrentText(message.message);
                        setCurrentWordIndex(0);
                        setProgress(0);
                        setSourceType('agent');
                        setIsRequestingNext(false); // Reset auto-advance lock
                    }
                }
                setTimeout(() => { toolWasUsedRef.current = false; }, 2000);
            }

            else if (message.type === 'user_transcript') {
                setMessages(prev => [...prev, { type: 'user', text: message.message }]);
                toolWasUsedRef.current = false;

                // Karaoke Logic
                setCurrentText(currentTextState => {
                    const currentParagraphs = currentTextState.split('\n').map(p => p.trim()).filter(p => p);
                    const currentAllWords = currentParagraphs.flatMap(p => p.split(/\s+/));

                    const cleanTargetWords = currentAllWords.map(w =>
                        w.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
                    );

                    const spokenWords = message.message.toLowerCase()
                        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
                        .split(/\s+/);

                    setCurrentWordIndex(prevIndex => {
                        let matchCount = 0;
                        let tempIndex = prevIndex;

                        spokenWords.forEach(spokenWord => {
                            if (tempIndex < cleanTargetWords.length) {
                                const target = cleanTargetWords[tempIndex];
                                if (spokenWord.includes(target) || target.includes(spokenWord)) {
                                    matchCount++;
                                    tempIndex++;
                                }
                            }
                        });

                        if (matchCount > 0) {
                            const newIndex = Math.min(prevIndex + matchCount, currentAllWords.length);
                            const newProgress = Math.min(100, (newIndex / currentAllWords.length) * 100);
                            setProgress(newProgress);
                            return newIndex;
                        }
                        return prevIndex;
                    });
                    return currentTextState;
                });
            }
        },
        onError: (error) => console.error('Error:', error),
    });

    const isConnected = conversation.status === 'connected';
    const isSpeaking = conversation.isSpeaking;

    // --- AUTO-ADVANCE LOGIC (NEW!) ---
    useEffect(() => {
        // If we are connected, have text, and reached the end...
        if (isConnected && totalWordCount > 0 && currentWordIndex >= totalWordCount) {

            // And we haven't already asked...
            if (!isRequestingNext && !isSpeaking) {
                console.log("🚀 Auto-advancing: User finished reading!");
                setIsRequestingNext(true); // Lock it so we don't ask twice

                // Wait 1.5s for dramatic effect (and to let the child finish speaking)
                setTimeout(() => {
                    // Send silent message to Agent
                    // Check if sendUserMessage is available (it should be)
                    if (conversation.sendUserMessage) {
                        conversation.sendUserMessage("I finished reading that part. Please show me the next sentence.");
                    } else {
                        // Fallback for older SDK versions
                        console.warn("sendUserMessage not found on conversation object");
                    }
                }, 1500);
            }
        }
    }, [currentWordIndex, totalWordCount, isConnected, isRequestingNext, isSpeaking, conversation]);


    // --- HANDLERS ---
    const handleStartStop = async () => {
        if (isConnected) {
            await conversation.endSession();
        } else {
            try {
                await conversation.startSession({ agentId: AGENT_ID });
            } catch (error) {
                console.error('Failed to start:', error);
            }
        }
    };

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
        setUploadStatus('');
    };

    const handleUpload = async () => {
        let content, name;
        if (textInput.trim()) {
            content = textInput;
            name = 'Pasted Text';
        } else if (selectedFile) {
            content = await selectedFile.text();
            name = selectedFile.name;
        } else {
            setUploadStatus('Please provide text or select a file.');
            return;
        }

        // Validation for file types if file is selected
        if (selectedFile) {
            const textTypes = [
                'text/plain', 'application/json', 'application/xml', 'text/csv',
                'text/html', 'application/javascript', 'application/x-javascript',
                'application/x-www-form-urlencoded', 'application/x-yaml',
                'text/markdown', 'text/xml', 'text/css',
            ];
            if (!textTypes.includes(selectedFile.type)) {
                setUploadStatus('Error: Only text-based files allowed.');
                return;
            }
        }

        setUploadStatus('Uploading...');
        try {
            const content = await selectedFile.text();
            const client = new ElevenLabsClient({
                apiKey: ELEVENLABS_API_KEY,
                environment: ElevenLabsEnvironment.Production,
            });
            await client.conversationalAi.knowledgeBase.documents.createFromText({
                text: content,
                name: name,
            });
            setCurrentText(content);
            setCurrentWordIndex(0);
            setUploadStatus(`Success! "${name}" added to knowledge base.`);
            setSelectedFile(null);
            setTextInput('');
        } catch (error) {
            console.error(error);
            setUploadStatus('Failed.');
        }
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
            />
            {/* SETTINGS MODAL */}
            {showSettings && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-4 border-blue-100">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Parent Zone 🔒</h2>
                            <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-full cursor-pointer">
                                <X size={24} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 flex flex-col items-center gap-2 text-center">
                                <Upload size={32} className="text-blue-400" />
                                <p className="text-sm text-gray-600 font-medium">Upload Story Text</p>
                                <input type="file" onChange={handleFileChange} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer" />
                            </div>
                            {uploadStatus && <p className="text-center text-sm font-bold text-blue-600">{uploadStatus}</p>}
                            <button onClick={handleUpload} disabled={!selectedFile} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                                Upload to Agent
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <header className="flex justify-between items-center mb-4 md:mb-6 lg:mb-8">
                <div className="flex items-center gap-4 flex-1">
                    <span className="text-2xl font-bold text-yellow-500 hidden md:block">⭐ Star Power:</span>
                    <div className="h-6 w-full max-w-md bg-gray-200 rounded-full overflow-hidden border-2 border-gray-300">
                        <div className="h-full bg-yellow-400 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                    </div>
                </div>
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
                                return (
                                    <span key={globalIndex} className={`px-2 py-1 rounded-lg transition-all duration-300 ease-in-out text-2xl md:text-4xl lg:text-5xl font-bold leading-relaxed font-comic ${globalIndex === currentWordIndex ? 'bg-yellow-300 text-black scale-110 transform shadow-md rotate-1' :
                                        globalIndex < currentWordIndex ? 'text-blue-300' : 'text-gray-700'
                                        }`}>
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
                <ControlButton icon={<HelpCircle size={28} />} label="I'm Stuck" color="orange" onClick={() => console.log('Help')} />
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

const ControlButton = ({ icon, label, color, onClick }) => {
    const colors = { orange: "bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-300" };
    return (
        <button onClick={onClick} className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-colors font-bold border-b-4 active:border-b-0 active:translate-y-1 cursor-pointer w-24 ${colors[color]}`}>
            {icon}
            <span className="mt-1 text-sm md:text-base">{label}</span>
        </button>
    );
};

export default Reader;
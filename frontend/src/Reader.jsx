import React, { useState, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import { ElevenLabsClient, ElevenLabsEnvironment } from '@elevenlabs/elevenlabs-js';
import { Mic, Volume2, HelpCircle, Play, Square, Settings, Upload, X } from 'lucide-react';

// --- MOCK DATA FOR THE READING TEXT ---
const SAMPLE_SENTENCE = "Hey Parent! Upload a text-based file to the settings in the upper right hand corner!";
const SAMPLE_WORDS = SAMPLE_SENTENCE.split(" ");

function Reader() {
    // --- STATE MANAGEMENT ---
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [micVolume, setMicVolume] = useState(0);
    const [progress, setProgress] = useState(10);

    // Parent/Settings Mode State
    const [showSettings, setShowSettings] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [messages, setMessages] = useState([]); // From teammate's code
    const [currentText, setCurrentText] = useState(SAMPLE_SENTENCE);

    const currentWords = currentText.split(" ");

    // --- 1. ELEVENLABS HOOK ---
    const conversation = useConversation({
        onConnect: () => console.log('Connected to Reader Agent'),
        onDisconnect: () => console.log('Disconnected'),
        onMessage: (message) => {
            console.log('Message:', message);
            if (message.type === 'agent_response') {
                setMessages(prev => [...prev, { type: 'agent', text: message.message }]);
            }
        },
        onError: (error) => console.error('Error:', error),
    });

    const isConnected = conversation.status === 'connected';
    const isSpeaking = conversation.isSpeaking;

    // --- 2. HANDLERS ---
    const handleStartStop = async () => {
        if (isConnected) {
            await conversation.endSession();
        } else {
            try {
                await conversation.startSession({
                    agentId: 'agent_0001kgx6svdneret8meb62y6ksbj',
                });
            } catch (error) {
                console.error('Failed to start:', error);
            }
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        setUploadStatus('');
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setUploadStatus('Please select a file first.');
            return;
        }

        // Validation from teammate's code
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

        setUploadStatus('Uploading...');

        try {
            const content = await selectedFile.text();

            const client = new ElevenLabsClient({
                apiKey: 'e5b22b9f4c5f7727704a4092741f7d223f7f5b1cc49d9a24146d46d736f2c1ac',
                environment: ElevenLabsEnvironment.Production,
            });

            await client.conversationalAi.knowledgeBase.documents.createFromText({
                text: content,
                name: selectedFile.name,
            });

            setCurrentText(content);
            setCurrentWordIndex(0);
            setUploadStatus(`Success! "${selectedFile.name}" added to knowledge base.`);
            setSelectedFile(null);
        } catch (error) {
            console.error('Error uploading file:', error);
            setUploadStatus('Upload failed. Check console for details.');
        }
    };

    // --- 4. VISUALIZER ANIMATION ---
    useEffect(() => {
        let interval;
        if (isConnected) {
            interval = setInterval(() => setMicVolume(Math.random() * 100), 100);
        } else {
            setMicVolume(0);
        }
        return () => clearInterval(interval);
    }, [isConnected]);

    return (
        <div className="flex flex-col min-h-screen bg-blue-50 p-4 md:p-6 lg:p-8 font-sans relative">

            {/* --- PARENT SETTINGS MODAL --- */}
            {showSettings && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-4 border-blue-100">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Parent Zone 🔒</h2>
                            <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-full cursor-pointer">
                                <X size={24} className="text-gray-500" />
                            </button>
                        </div>

                        {/* File Upload Section */}
                        <div className="space-y-4">
                            <div className="p-4 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 flex flex-col items-center gap-2 text-center">
                                <Upload size={32} className="text-blue-400" />
                                <p className="text-sm text-gray-600 font-medium">Upload Story Text</p>
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
                                />
                            </div>

                            {uploadStatus && (
                                <p className={`text-center text-sm font-bold ${uploadStatus.includes('Success') ? 'text-green-600' : (uploadStatus.includes('Error') || uploadStatus.includes('failed')) ? 'text-red-500' : 'text-blue-600'}`}>
                                    {uploadStatus}
                                </p>
                            )}

                            <button
                                onClick={handleUpload}
                                disabled={!selectedFile}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Upload to Agent
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- HEADER --- */}
            <header className="flex justify-between items-center mb-4 md:mb-6 lg:mb-8">
                <div className="flex items-center gap-4 flex-1">
                    <span className="text-2xl font-bold text-yellow-500 hidden md:block">⭐ Star Power:</span>
                    <div className="h-6 w-full max-w-md bg-gray-200 rounded-full overflow-hidden border-2 border-gray-300">
                        <div
                            className="h-full bg-yellow-400 transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Settings Button */}
                <button
                    onClick={() => setShowSettings(true)}
                    className="ml-4 p-3 bg-white rounded-full shadow-md hover:bg-gray-50 transition border border-blue-100 text-gray-400 hover:text-blue-500 cursor-pointer"
                >
                    <Settings size={24} />
                </button>
            </header>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 flex flex-col items-center justify-center gap-4 md:gap-6 lg:gap-8 max-w-4xl mx-auto w-full">
                {/* Avatar */}
                <div className="relative">
                    <AvatarDisplay isSpeaking={isSpeaking} isConnected={isConnected} />
                    <div className="absolute -right-12 md:-right-16 lg:-right-20 top-0 bg-white px-4 py-2 rounded-xl shadow-lg border border-blue-100 hidden md:block">
                        <p className="text-sm font-bold text-blue-600">
                            {isConnected ? (isSpeaking ? "My turn!" : "I'm listening...") : "Ready?"}
                        </p>
                    </div>
                </div>

                {/* Text Pane */}
                <div className="bg-white p-4 md:p-6 lg:p-8 rounded-3xl shadow-xl border-4 border-blue-200 w-full text-center min-h-[200px] max-h-[300px] md:max-h-[400px] lg:max-h-[500px] overflow-y-auto flex justify-center pt-4 md:pt-6 lg:pt-8">
                    <div className="flex flex-wrap justify-center gap-3 text-2xl md:text-4xl lg:text-5xl font-bold leading-relaxed text-gray-700 font-comic pr-4">
                        {currentWords.map((word, index) => (
                            <span
                                key={index}
                                className={`px-2 py-1 rounded-lg transition-colors duration-300 ${index === currentWordIndex ? 'bg-yellow-200 text-black scale-105 transform' :
                                    index < currentWordIndex ? 'text-gray-300' : ''
                                    }`}
                            >
                                {word}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Visualizer */}
                <div className="h-12 flex items-end justify-center gap-1">
                    {isConnected ? [...Array(10)].map((_, i) => (
                        <div key={i} className="w-1 md:w-2 lg:w-3 bg-green-400 rounded-full transition-all duration-75"
                            style={{ height: `${Math.max(15, Math.random() * micVolume)}%`, opacity: 0.8 }} />
                    )) : (
                        <div className="text-gray-300 font-bold tracking-widest text-sm">MIC OFF</div>
                    )}
                </div>
            </main>

            {/* --- FOOTER CONTROLS --- */}
            <footer className="mt-8 grid grid-cols-3 gap-4 md:gap-6 w-full max-w-2xl mx-auto">
                <ControlButton icon={<Volume2 size={28} />} label="Read to Me" color="purple" onClick={() => console.log('Read')} />

                <button
                    onClick={handleStartStop}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all font-bold border-b-4 text-white shadow-lg active:border-b-0 active:translate-y-1 cursor-pointer ${isConnected ? 'bg-red-500 border-red-700 hover:bg-red-600' : 'bg-green-500 border-green-700 hover:bg-green-600'
                        }`}
                >
                    {isConnected ? <Square size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                    <span className="mt-1 text-sm md:text-base">{isConnected ? 'Stop' : 'Start'}</span>
                </button>

                <ControlButton icon={<HelpCircle size={28} />} label="I'm Stuck" color="orange" onClick={() => console.log('Help')} />
            </footer>
        </div>
    );
}

// Sub-components
const AvatarDisplay = ({ isSpeaking, isConnected }) => (
    <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-full flex items-center justify-center text-6xl md:text-7xl shadow-2xl border-4 border-white ring-4 ring-blue-100 transition-transform hover:scale-105">
        {!isConnected ? '🙂' : isSpeaking ? '🗣️' : '👂'}
    </div>
);

const ControlButton = ({ icon, label, color, onClick }) => {
    const colors = {
        purple: "bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300",
        orange: "bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-300"
    };
    return (
        <button onClick={onClick} className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-colors font-bold border-b-4 active:border-b-0 active:translate-y-1 cursor-pointer ${colors[color]}`}>
            {icon}
            <span className="mt-1 text-sm md:text-base">{label}</span>
        </button>
    );
};

export default Reader;
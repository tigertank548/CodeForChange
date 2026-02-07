import { useState } from 'react';
import { useConversation } from '@elevenlabs/react';

function Reader() {
    const [userInput, setUserInput] = useState('');
    const [messages, setMessages] = useState([]);

    const conversation = useConversation({
        onConnect: () => console.log('Connected to Reader Agent'),
        onMessage: (message) => {
            console.log('Message:', message);
            if (message.type === 'agent_response') {
                setMessages(prev => [...prev, { type: 'agent', text: message.message }]);
            } else if (message.type === 'user_transcript') {
                setMessages(prev => [...prev, { type: 'user', text: message.message }]);
            }
        },
        onError: (error) => console.error('Error:', error),
        onStatusChange: (status) => console.log('Status:', status),
    });

    const startConversation = async () => {
        try {
            await conversation.startSession({
                agentId: 'agent_9101kgx2fmzve6xakrnv9dnmza43', // Replace with actual agent ID
            });
        } catch (error) {
            console.error('Failed to start:', error);
        }
    };

    const endConversation = () => {
        conversation.endSession();
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const message = `Add this to knowledge base: ${content}`;
                conversation.sendUserMessage(message);
                setMessages(prev => [...prev, { type: 'user', text: `Uploaded file (${file.name}) to knowledge base` }]);
            };
            reader.readAsText(file);
        }
    };

    return (
        <div>
            <button onClick={startConversation} disabled={conversation.status === 'connected'}>
                Start Conversation
            </button>
            <button onClick={endConversation} disabled={conversation.status !== 'connected'}>
                End Conversation
            </button>
            <p>Status: {conversation.status}</p>
            <div>
                <input type="file" onChange={handleFileUpload} />
                <p>Upload a file to add to the agent's knowledge base</p>
            </div>
            <div>
                {messages.map((msg, index) => (
                    <p key={index}><strong>{msg.type}:</strong> {msg.text}</p>
                ))}
            </div>
        </div>
    );
}

export default Reader;
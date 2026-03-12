'use client';

import { useState, useEffect, useRef, use } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  Hand, 
  MessageSquare,
  Users,
  Settings,
  PhoneOff,
  Maximize,
  Minimize,
  Play,
  Pause,
  Send,
  FileText,
  ChevronLeft,
  MoreVertical,
  Circle,
  X
} from 'lucide-react';

interface LiveClassSession {
  id: string;
  title: string;
  instructor: string;
  startTime: string;
  duration: number;
  status: 'scheduled' | 'live' | 'ended';
}

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
}

interface Poll {
  id: string;
  question: string;
  options: { id: string; text: string; votes: number }[];
  isActive: boolean;
}

interface Participant {
  id: string;
  name: string;
  isHandRaised: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
}

export default function LiveClassPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showPolls, setShowPolls] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [polls, setPolls] = useState<Poll[]>([
    {
      id: '1',
      question: 'Do you understand the concept?',
      options: [
        { id: 'a', text: 'Yes, completely', votes: 15 },
        { id: 'b', text: 'Need more clarification', votes: 5 },
        { id: 'c', text: 'No, please explain again', votes: 2 }
      ],
      isActive: true
    }
  ]);
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: 'Ravindra Sir', isHandRaised: false, isMuted: false, isVideoOn: true },
    { id: '2', name: 'Student A', isHandRaised: true, isMuted: false, isVideoOn: true },
    { id: '3', name: 'Student B', isHandRaised: false, isMuted: true, isVideoOn: false },
  ]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setChatMessages([
      { id: '1', user: 'System', message: 'Welcome to the live class!', timestamp: new Date() },
      { id: '2', user: 'Ravindra Sir', message: 'Good morning everyone! Let\'s begin.', timestamp: new Date() },
    ]);
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const sendMessage = () => {
    if (!chatMessage.trim()) return;
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      user: 'You',
      message: chatMessage,
      timestamp: new Date()
    }]);
    setChatMessage('');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const raiseHand = () => {
    const myParticipant = participants.find(p => p.id === 'self');
    if (myParticipant) {
      setParticipants(prev => prev.map(p => 
        p.id === 'self' ? { ...p, isHandRaised: !p.isHandRaised } : p
      ));
    } else {
      setParticipants(prev => [...prev, {
        id: 'self',
        name: 'You',
        isHandRaised: true,
        isMuted: !isMicOn,
        isVideoOn
      }]);
    }
  };

  const votePoll = (pollId: string, optionId: string) => {
    setPolls(prev => prev.map(poll => {
      if (poll.id === pollId && poll.isActive) {
        return {
          ...poll,
          options: poll.options.map(opt => 
            opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
          )
        };
      }
      return poll;
    }));
  };

  const totalVotes = polls[0]?.options.reduce((sum, opt) => sum + opt.votes, 0) || 0;

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <header className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-gray-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="text-white font-semibold">Live Class: Physics - Mechanics</h1>
            <p className="text-gray-400 text-sm">Ravindra Sir • {formatTime(elapsedTime)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 text-red-500">
            <Circle className="w-3 h-3 fill-current animate-pulse" />
            LIVE
          </span>
          <button className="p-2 text-gray-400 hover:text-white">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div ref={videoRef} className="flex-1 relative bg-black flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4">
                <Users className="w-16 h-16 text-gray-500" />
              </div>
              <p className="text-gray-400">Instructor Video</p>
              <p className="text-gray-500 text-sm">Ravindra Sir</p>
            </div>

            <div className="absolute top-4 right-4 flex gap-2">
              <button 
                onClick={raiseHand}
                className="p-2 bg-gray-800 rounded-lg text-gray-300 hover:bg-gray-700"
              >
                <Hand className="w-5 h-5" />
              </button>
              <button 
                onClick={toggleFullscreen}
                className="p-2 bg-gray-800 rounded-lg text-gray-300 hover:bg-gray-700"
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>

            <div className="absolute bottom-4 left-4 flex gap-2">
              <div className="bg-gray-800/80 px-3 py-1 rounded-lg">
                <span className="text-white text-sm"> viewers</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsVideoOn(!isVideoOn)}
                  className={`p-3 rounded-full ${isVideoOn ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'}`}
                >
                  {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setIsMicOn(!isMicOn)}
                  className={`p-3 rounded-full ${isMicOn ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'}`}
                >
                  {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setIsScreenSharing(!isScreenSharing)}
                  className={`p-3 rounded-full ${isScreenSharing ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}
                >
                  <Monitor className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowChat(!showChat)}
                  className={`p-2 rounded-lg ${showChat ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowParticipants(!showParticipants)}
                  className={`p-2 rounded-lg ${showParticipants ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  <Users className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowPolls(!showPolls)}
                  className={`p-2 rounded-lg ${showPolls ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  <FileText className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600">
                  <Settings className="w-5 h-5" />
                </button>
                <button className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 ml-4">
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {showChat && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-white font-semibold">Chat</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`${msg.user === 'You' ? 'ml-8' : 'mr-8'}`}>
                  <div className={`rounded-lg p-3 ${msg.user === 'You' ? 'bg-blue-600' : msg.user === 'System' ? 'bg-gray-700' : 'bg-gray-700'}`}>
                    <p className="text-xs text-gray-300 mb-1">{msg.user}</p>
                    <p className="text-white text-sm">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg text-sm"
                />
                <button 
                  onClick={sendMessage}
                  className="p-2 bg-blue-600 text-white rounded-lg"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {showParticipants && (
          <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-white font-semibold">Participants ({participants.length})</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {participants.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                      <span className="text-white text-sm">{p.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-white text-sm">{p.name}</p>
                      <p className="text-gray-400 text-xs">
                        {p.isMuted ? 'Muted' : 'Unmuted'}
                      </p>
                    </div>
                  </div>
                  {p.isHandRaised && <Hand className="w-4 h-4 text-yellow-500" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {showPolls && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-white font-semibold">Polls</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {polls.map(poll => (
                <div key={poll.id} className="bg-gray-700 rounded-lg p-4">
                  <p className="text-white font-medium mb-3">{poll.question}</p>
                  <div className="space-y-2">
                    {poll.options.map(option => (
                      <button
                        key={option.id}
                        onClick={() => votePoll(poll.id, option.id)}
                        disabled={!poll.isActive}
                        className="w-full text-left p-2 rounded bg-gray-600 hover:bg-gray-500 transition-colors"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-white text-sm">{option.text}</span>
                          <span className="text-gray-300 text-xs">
                            {totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0}%
                          </span>
                        </div>
                        <div className="h-1 bg-gray-500 rounded overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0}%` }}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-gray-400 text-xs mt-2">{totalVotes} votes</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

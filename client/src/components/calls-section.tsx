import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Clock } from "lucide-react";
import { IncomingCall } from "@/hooks/use-twilio-device";
import { useEffect, useState } from "react";

interface CallsSectionProps {
  incomingCall: IncomingCall | null;
  activeCall: IncomingCall | null;
  onAnswer: () => void;
  onReject: () => void;
  onHangUp: () => void;
}

export function CallsSection({ 
  incomingCall, 
  activeCall, 
  onAnswer, 
  onReject, 
  onHangUp 
}: CallsSectionProps) {
  const [callDuration, setCallDuration] = useState<string>("00:00");

  // Calculate call duration for active calls
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeCall && activeCall.status === 'answered') {
      interval = setInterval(() => {
        const now = new Date();
        const startTime = new Date(activeCall.timestamp);
        const diffMs = now.getTime() - startTime.getTime();
        const minutes = Math.floor(diffMs / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);
        setCallDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
      setCallDuration("00:00");
    };
  }, [activeCall]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (incomingCall && incomingCall.status === 'ringing') {
        if (event.key === 'Enter') {
          event.preventDefault();
          onAnswer();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          onReject();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [incomingCall, onAnswer, onReject]);

  // Don't render if no calls
  if (!incomingCall && !activeCall) {
    return null;
  }

  const formatPhoneNumber = (phone: string) => {
    // Remove +1 prefix and format as (XXX) XXX-XXXX
    const cleaned = phone.replace(/^\+1/, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className="mb-6">
      <Card className="border-2 border-blue-200 shadow-lg">
        <CardContent className="p-6">
          {/* Incoming Call */}
          {incomingCall && incomingCall.status === 'ringing' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Phone className="h-6 w-6 text-blue-600 animate-pulse" />
                <h3 className="text-xl font-semibold text-gray-900">Incoming Call</h3>
              </div>
              
              <div className="space-y-2">
                <p className="text-2xl font-bold text-gray-900">
                  {formatPhoneNumber(incomingCall.from)}
                </p>
                <p className="text-sm text-gray-600">
                  {incomingCall.direction === 'inbound' ? 'Inbound Call' : 'Outbound Call'}
                </p>
              </div>

              <div className="flex justify-center space-x-4">
                <Button
                  onClick={onAnswer}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold"
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Answer (Enter)
                </Button>
                <Button
                  onClick={onReject}
                  variant="destructive"
                  size="lg"
                  className="px-8 py-3 text-lg font-semibold"
                >
                  <PhoneOff className="h-5 w-5 mr-2" />
                  Decline (Esc)
                </Button>
              </div>
            </div>
          )}

          {/* Active Call */}
          {activeCall && activeCall.status === 'answered' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Clock className="h-6 w-6 text-green-600" />
                <h3 className="text-xl font-semibold text-gray-900">Active Call</h3>
              </div>
              
              <div className="space-y-2">
                <p className="text-2xl font-bold text-gray-900">
                  {formatPhoneNumber(activeCall.from)}
                </p>
                <p className="text-lg font-mono text-green-600 font-semibold">
                  {callDuration}
                </p>
                <p className="text-sm text-gray-600">
                  {activeCall.direction === 'inbound' ? 'Inbound Call' : 'Outbound Call'}
                </p>
              </div>

              <Button
                onClick={onHangUp}
                variant="destructive"
                size="lg"
                className="px-8 py-3 text-lg font-semibold"
              >
                <PhoneOff className="h-5 w-5 mr-2" />
                Hang Up
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
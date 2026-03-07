import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';

const AntiGravityLoader = ({ onFinish }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(timer);
                    setTimeout(onFinish, 400);
                    return 100;
                }
                return prev + 4;
            });
        }, 30);

        return () => clearInterval(timer);
    }, [onFinish]);

    return (
        <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center font-['Outfit']">
            <div className="flex flex-col items-center gap-8">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse rounded-full" />
                    <div className="p-6 bg-blue-500/10 rounded-full border border-blue-500/30 relative z-10">
                        <Shield className="text-blue-500 animate-pulse" size={64} />
                    </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <div className="text-blue-400 font-bold tracking-[0.3em] uppercase text-sm animate-pulse">
                        Authenticating...
                    </div>

                    <div className="w-64 h-[2px] bg-blue-900/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-75 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AntiGravityLoader;

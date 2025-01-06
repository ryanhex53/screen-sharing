"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToastAction } from "@/components/ui/toast";
import { useIp } from "@/hooks/use-ip";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Monitor, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Peer from "peerjs";
import { useEffect, useRef, useState } from "react";
import { getTurnCredentials } from "../actions";
import { ShareOptions } from "./_components/ShareOptions";

export default function HostPage() {
    const tc = useTranslations("Common");
    const t = useTranslations("HostPage");
    const userIp = useIp();
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [roomId, setRoomId] = useState("");
    const [peer, setPeer] = useState<Peer | null>(null);
    const [hostStream, setHostStream] = useState<MediaStream | null>(null);
    const [connections, setConnections] = useState<string[]>([]);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const initializePeer = async () => {
            try {
                const turnConfig = await getTurnCredentials(userIp);
                const newPeer = new Peer({
                    host: "peerjs.linkgz.cn",
                    secure: true,
                    path: "/myapp",
                    config: {
                        iceServers: [{ urls: "stun:stun.l.google.com:19302" }, turnConfig.iceServers],
                        sdpSemantics: "unified-plan"
                    }
                });
                setPeer(newPeer);

                newPeer.on("open", (id) => {
                    setRoomId(id);
                });

                newPeer.on("connection", (connection) => {
                    if (connections.length === 0) {
                        connection.send("allow-audio-stream");
                    }
                    setConnections((prev) => [...prev, connection.peer]);

                    connection.on("close", () => {
                        setConnections((prev) => prev.filter((peerId) => peerId !== connection.peer));
                    });
                });

                return () => {
                    newPeer.destroy();
                };
            } catch (error) {
                console.error("Error initializing peer:", error);
            }
        };

        initializePeer();
    }, []);

    useEffect(() => {
        if (!peer) return;

        if (!hostStream) {
            if (connections.length > 0) {
                toast({
                    title: t("new-viewer"),
                    description: t("new-viewer-desc"),
                    duration: Infinity,
                    action: (
                        <ToastAction
                            altText={t("start-sharing")}
                            onClick={async () => {
                                let micStream;
                                try {
                                    micStream = await navigator.mediaDevices.getUserMedia({
                                        video: false,
                                        audio: true
                                    });
                                } catch (err) {
                                    console.warn("Microphone access error:", err);
                                }
                                try {
                                    const stream = await navigator.mediaDevices.getDisplayMedia({
                                        video: true,
                                        audio: true
                                    });
                                    if (micStream) stream.addTrack(micStream.getAudioTracks()[0]);
                                    setHostStream(stream);
                                } catch (err) {
                                    console.error("Screen sharing error:", err);
                                    toast({
                                        title: t("share-error"),
                                        description: t("share-error-desc"),
                                        variant: "destructive"
                                    });
                                }
                            }}>
                            {t("start-sharing")}
                        </ToastAction>
                    )
                });
            }
        } else {
            connections.forEach((connection, idx) => {
                const call = peer.call(connection, hostStream);

                if (idx === 0) {
                    call.on("stream", (stream) => {
                        setRemoteStream(stream);
                    });
                }

                hostStream.getTracks()[0].onended = () => {
                    call.close();
                    hostStream.getTracks().forEach((track) => track.stop());
                };
            });
        }
    }, [peer, toast, hostStream, connections]);

    useEffect(() => {
        if (audioRef.current && remoteStream) {
            audioRef.current.srcObject = remoteStream;
            audioRef.current.play().catch(console.error);
        }
    }, [remoteStream]);

    function endSession() {
        if (hostStream) {
            hostStream.getTracks().forEach((track) => track.stop());
            setHostStream(null);
        }

        if (peer) {
            peer.destroy();
            setPeer(null);
        }

        setConnections([]);
        setRoomId("");

        toast({
            title: t("session-ended"),
            description: t("session-ended-desc")
        });

        router.push("/");
    }

    return (
        <div className="py-8 px-4">
            <div className="max-w-2xl mx-auto space-y-8">
                <Button variant="outline" asChild>
                    <Link href="/" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        {tc("back-to-home")}
                    </Link>
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Monitor className="h-6 w-6" />
                            {t("title")}
                        </CardTitle>
                        <CardDescription>{t("description")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <ShareOptions roomId={roomId} />

                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-gray-500" />
                                <span className="text-sm text-gray-500">{t("current-viewers")}</span>
                            </div>
                            <span className="text-lg font-semibold">{connections.length}</span>
                        </div>

                        <audio ref={audioRef} autoPlay hidden />

                        {hostStream && (
                            <div className="flex justify-end pt-4">
                                <Button variant="destructive" onClick={endSession} className="flex items-center gap-2">
                                    {t("stop-sharing")}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

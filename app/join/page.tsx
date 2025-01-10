"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useIp } from "@/hooks/use-ip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ArrowLeft, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Peer, { MediaConnection } from "peerjs";
import { useEffect, useRef, useState } from "react";
import { getTurnCredentials } from "../actions";
import "./styles.css";

const UUID4_REGEX = /^[a-f\d]{8}-([\da-f]{4}-){3}[\da-f]{12}$/i;

export default function JoinPage() {
    const tc = useTranslations("Common");
    const t = useTranslations("JoinPage");
    const userIp = useIp();
    const [roomId, setRoomId] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);
    const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
    const [showFullButtons, setShowFullButtons] = useState(false);
    const [isFullPage, setIsFullPage] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const peerRef = useRef<Peer | null>(null);
    const clientCall = useRef<MediaConnection | null>(null);
    const clientStream = useRef<MediaStream | null>(null);
    const { toast } = useToast();

    let timer: NodeJS.Timeout;
    const handleMouseMove = () => {
        setShowFullButtons(true);
        clearTimeout(timer);
        timer = setTimeout(() => {
            setShowFullButtons(false);
        }, 2000);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const roomFromUrl = params.get("room");
        if (roomFromUrl && UUID4_REGEX.test(roomFromUrl)) {
            setRoomId(roomFromUrl);
            joinRoom(roomFromUrl);
        }

        window.addEventListener("mousemove", handleMouseMove);

        return () => {
            if (peerRef.current) {
                peerRef.current.destroy();
                peerRef.current = null;
            }
            window.removeEventListener("mousemove", handleMouseMove);
            clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        if (videoRef.current && activeStream) {
            videoRef.current.srcObject = activeStream;
            videoRef.current.play().catch(console.error);
        }
    }, [activeStream]);

    async function joinRoom(roomIdToJoin: string = roomId) {
        if (!roomIdToJoin.trim()) {
            toast({
                title: t("code-required"),
                description: t("code-required-desc"),
                variant: "destructive"
            });
            return;
        }

        setIsConnecting(true);

        const turnConfig = await getTurnCredentials(userIp);

        const peer = new Peer({
            host: "peerjs.linkgz.cn",
            secure: true,
            path: "/myapp",
            config: {
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }, turnConfig.iceServers],
                sdpSemantics: "unified-plan"
            }
        });
        peerRef.current = peer;

        peer.on("open", () => {
            const connection = peer.connect(roomIdToJoin);

            connection.on("open", () => {
                toast({
                    title: t("connected"),
                    duration: 10000,
                    description: t("connected-desc")
                });

                connection.on("data", (data) => {
                    console.log("Data received:", data);
                    if (data === "allow-audio-stream") {
                        toast({
                            title: t("first-mic-allow-title"),
                            description: t("first-mic-allow-desc")
                        });
                        navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then((stream) => {
                            clientStream.current = stream;
                            clientCall.current = peer.call(roomIdToJoin, stream);
                        });
                    }
                });
            });

            peer.on("call", (call) => {
                call.answer();
                call.on("stream", (remoteStream) => {
                    setActiveStream(remoteStream);
                });
            });

            connection.on("close", () => {
                setIsConnecting(false);
                setRoomId("");
                setActiveStream(null);
                toast({
                    title: t("disconnected"),
                    description: t("disconnected-desc"),
                    variant: "destructive"
                });
                clientCall.current?.close();
                clientStream.current?.getTracks().forEach((track) => track.stop());
            });
        });

        peer.on("error", (err) => {
            console.error("Peer error:", err);
            setIsConnecting(false);
            toast({
                title: t("connection-failed"),
                description: t("connection-failed-desc"),
                variant: "destructive"
            });
        });
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
                            <Users className="h-6 w-6" />
                            {t("title")}
                        </CardTitle>
                        <CardDescription>{t("description")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {!activeStream ? (
                            <div className="space-y-4">
                                <Input placeholder={t("enter-code")} value={roomId} onChange={(e) => setRoomId(e.target.value)} disabled={isConnecting} />
                                <Button className="w-full" onClick={() => joinRoom()} disabled={isConnecting || !UUID4_REGEX.test(roomId)}>
                                    {isConnecting ? t("connecting") : t("join-room")}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden group">
                                    <video ref={videoRef} className={cn("w-full h-full object-contain", { "full-page": isFullPage })} autoPlay playsInline loop controls />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            {activeStream && (
                <div id="fullPageButtons" className={cn("absolute top-1 right-1", { show: showFullButtons, hide: !showFullButtons })} style={{ zIndex: 100 }}>
                    {isFullPage ? (
                        <Button variant="outline" onClick={() => setIsFullPage(false)}>
                            {t("exit-full-page")}
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={() => setIsFullPage(true)}>
                            {t("full-page")}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

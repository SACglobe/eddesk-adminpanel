"use client";

import React from 'react';
import { useLoading } from '@/providers/LoadingProvider';

export default function LoadingOverlay() {
    const { isLoading } = useLoading();

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto">
            {/* Much darker backdrop for better text contrast */}
            <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md animate-in fade-in duration-500" />
            
            <div className="relative flex flex-col items-center gap-10 animate-in zoom-in-95 duration-700">
                {/* 3D Book Animation inside White Circle */}
                <div className="icon-circle shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
                    <div className="book-container">
                        <div className="book">
                            <div className="page page-1"></div>
                            <div className="page page-2"></div>
                            <div className="page page-3"></div>
                            <div className="page page-4"></div>
                            <div className="page page-5"></div>
                        </div>
                    </div>
                </div>

                <div className="text-center space-y-3 animate-pulse">
                    <p className="text-white text-[15px] font-black tracking-[0.3em] uppercase drop-shadow-lg">Processing</p>
                    <div className="flex items-center justify-center gap-2">
                        <div className="h-0.5 w-6 bg-[#F54927] rounded-full opacity-50" />
                        <p className="text-[#F54927] text-[10px] font-black tracking-[0.4em] uppercase opacity-90">Synchronizing</p>
                        <div className="h-0.5 w-6 bg-[#F54927] rounded-full opacity-50" />
                    </div>
                </div>
            </div>

            <style jsx>{`
                .icon-circle {
                    width: 100px;
                    height: 100px;
                    background: #ffffff;
                    border-radius: 50%;
                    border: 1px solid rgba(245, 73, 39, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }

                .book-container {
                    perspective: 1200px;
                    width: 40px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transform: translateX(4px);
                }

                .book {
                    width:100%;
                    height:100%;
                    position: relative;
                    transform-style: preserve-3d;
                    transform: rotateX(30deg) rotateY(-15deg);
                    animation: book-tilt 4s ease-in-out infinite alternate;
                }

                .page {
                    position: absolute;
                    width: 20px;
                    height: 28px;
                    top: 0;
                    right: 0;
                    background-color: rgba(245, 73, 39, 0.2);
                    backdrop-filter: blur(2px);
                    transform-origin: left center;
                    border-radius: 0 2px 2px 0;
                    box-shadow: inset 1px 0 4px rgba(245, 73, 39, 0.1), 
                                1px 1px 3px rgba(0, 0, 0, 0.05);
                    border: 1px solid rgba(245, 73, 39, 0.4);
                    border-left: 1.5px solid #F54927;
                    animation: flip 2s ease-in-out infinite;
                }

                .book::before {
                    content: '';
                    position: absolute;
                    width: 20px;
                    height: 28px;
                    left: 0;
                    top: 0;
                    background-color: rgba(245, 73, 39, 0.1);
                    border-radius: 2px 0 0 2px;
                    box-shadow: -1px 1px 3px rgba(0, 0, 0, 0.05);
                    border: 1px solid rgba(245, 73, 39, 0.2);
                    border-right: 1.5px solid #F54927;
                }

                .book::after {
                    content: '';
                    position: absolute;
                    width: 20px;
                    height: 28px;
                    right: 0;
                    top: 0;
                    background-color: rgba(245, 73, 39, 0.15);
                    border-radius: 0 2px 2px 0;
                    box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.05);
                    border: 1px solid rgba(245, 73, 39, 0.3);
                    border-left: 1.5px solid #F54927;
                }

                .page-1 { animation-delay: 0s; z-index: 5; }
                .page-2 { animation-delay: 0.2s; z-index: 4; }
                .page-3 { animation-delay: 0.4s; z-index: 3; }
                .page-4 { animation-delay: 0.6s; z-index: 2; }
                .page-5 { animation-delay: 0.8s; z-index: 1; }

                @keyframes flip {
                    0% { transform: rotateY(0deg); background-color: rgba(245, 73, 39, 0.25); }
                    50% { background-color: rgba(245, 73, 39, 0.15); }
                    100% { transform: rotateY(-180deg); background-color: rgba(245, 73, 39, 0.05); }
                }

                @keyframes book-tilt {
                    0% { transform: rotateX(25deg) rotateY(-10deg); }
                    100% { transform: rotateX(35deg) rotateY(-20deg); }
                }

                .page-1 { animation-delay: 0s; z-index: 5; }
                .page-2 { animation-delay: 0.2s; z-index: 4; }
                .page-3 { animation-delay: 0.4s; z-index: 3; }
                .page-4 { animation-delay: 0.6s; z-index: 2; }
                .page-5 { animation-delay: 0.8s; z-index: 1; }

                @keyframes flip {
                    0% {
                        transform: rotateY(0deg);
                        background-color: rgba(245, 73, 39, 0.2);
                    }
                    50% {
                        background-color: rgba(245, 73, 39, 0.1);
                    }
                    100% {
                        transform: rotateY(-180deg);
                        background-color: rgba(245, 73, 39, 0.05);
                    }
                }

                @keyframes book-tilt {
                    0% { transform: rotateX(25deg) rotateY(-10deg); }
                    100% { transform: rotateX(35deg) rotateY(-20deg); }
                }
            `}</style>
        </div>
    );
}

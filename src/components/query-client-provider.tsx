"use client";

import { queryClient } from "@/lib/api";
import { QueryClientProvider } from "@tanstack/react-query";

export default function _QueryClientProvider({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}
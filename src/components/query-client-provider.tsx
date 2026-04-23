"use client";

import {queryClient} from "@/lib/api"

export default function QueryClientProvider({
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
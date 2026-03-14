import { Header } from "@/components/header";
import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <div className="flex flex-col h-dvh">
      <Header />
      <main className="flex-1 overflow-hidden max-w-2xl w-full mx-auto">
        <Chat />
      </main>
    </div>
  );
}

import avatarImg from "@/assets/ai-avatar.png";

interface DialogBubbleProps {
  message: string;
  className?: string;
}

export function DialogBubble({ message, className = "" }: DialogBubbleProps) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <img
        src={avatarImg}
        alt="Petra – KI-Assistentin"
        className="w-10 h-10 rounded-full border-2 border-primary/20 shrink-0 object-cover"
      />
      <div className="dialog-bubble flex-1">
        <p className="text-sm leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

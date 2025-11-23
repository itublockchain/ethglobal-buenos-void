"use client";

import { useEffect, useState } from "react";

interface DecryptedTextProps {
  text: string;
  className?: string;
  speed?: number;
}

const CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$.,";

export function DecryptedText({
  text,
  className = "",
  speed = 50,
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    // Sürekli rastgele karakterler göster
    const interval = setInterval(() => {
      setDisplayText(
        text
          .split("")
          .map((char) => {
            if (char === " ") return " ";
            return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
          })
          .join("")
      );
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span className={`${className} glitch-text`} data-text={displayText}>
      {displayText}
    </span>
  );
}

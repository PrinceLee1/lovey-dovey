import { motion } from "framer-motion";

export default function FloatingHearts() {
  const hearts = Array.from({ length: 5 }); // fewer hearts

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {hearts.map((_, i) => {
        const size = Math.random() * 80 + 60; // MUCH bigger: 60–140px
        const left = Math.random() * 100;
        const duration = Math.random() * 35 + 35; // slower: 35–70s
        const delay = Math.random() * 10;

        return (
          <motion.svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgb(236 72 153)" // pink-500
            strokeWidth="1.6"
            className="absolute opacity-20"  //  MUCH MORE VISIBLE
            style={{ left: `${left}%`, bottom: "-120px" }}
            initial={{ y: 0, opacity: 0 }}
            animate={{
              y: "-120vh",
              opacity: [0, 0.25, 0.25, 0], // 👈visible mid-flight
              x: [0, 40, -40, 0],
              rotate: [0, 25, -25, 0],
            }}
            transition={{
              duration,
              repeat: Infinity,
              delay,
              ease: "easeInOut",
            }}
          >
            <path d="M12 21s-6.7-4.35-9.4-8.15C.86 10.64 2.2 6.86 5.5 6.5c2.04-.22 3.4 1.21 4.5 2.5 1.1-1.29 2.46-2.72 4.5-2.5 3.29.36 4.64 4.14 2.93 6.35C18.7 16.65 12 21 12 21z" />
          </motion.svg>
        );
      })}
    </div>
  );
}
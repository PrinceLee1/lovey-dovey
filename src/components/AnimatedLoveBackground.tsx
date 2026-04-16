import { motion } from "framer-motion";

export default function AnimatedLoveBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <svg className="absolute w-0 h-0">
        <defs>
          {/* Gooey blur to make shapes look like clouds */}
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="60" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 25 -15"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <div className="absolute inset-0" style={{ filter: "url(#goo)" }}>
        {/* Cloud 1 */}
        <motion.div
          className="absolute w-[700px] h-[700px] bg-pink-300 opacity-60 rounded-full"
          animate={{
            x: [0, 120, -80, 0],
            y: [0, -100, 120, 0],
            borderRadius: [
              "40% 60% 60% 40% / 60% 40% 60% 40%",
              "60% 40% 30% 70% / 30% 60% 40% 70%",
              "50% 60% 70% 40% / 50% 40% 60% 50%",
              "40% 60% 60% 40% / 60% 40% 60% 40%",
            ],
          }}
          transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
          style={{ top: "10%", left: "5%" }}
        />

        {/* Cloud 2 */}
        <motion.div
          className="absolute w-[600px] h-[600px] bg-fuchsia-300 opacity-60 rounded-full"
          animate={{
            x: [0, -140, 100, 0],
            y: [0, 120, -120, 0],
            borderRadius: [
              "60% 40% 70% 30% / 50% 60% 40% 50%",
              "30% 70% 40% 60% / 60% 30% 70% 40%",
              "50% 50% 60% 40% / 40% 60% 50% 50%",
              "60% 40% 70% 30% / 50% 60% 40% 50%",
            ],
          }}
          transition={{ duration: 45, repeat: Infinity, ease: "easeInOut" }}
          style={{ bottom: "10%", right: "5%" }}
        />

        {/* Cloud 3 */}
        <motion.div
          className="absolute w-[500px] h-[500px] bg-rose-200 opacity-60 rounded-full"
          animate={{
            x: [0, 100, -60, 0],
            y: [0, 80, -100, 0],
            borderRadius: [
              "50% 50% 40% 60% / 60% 40% 50% 50%",
              "70% 30% 60% 40% / 40% 60% 30% 70%",
              "60% 40% 50% 50% / 50% 50% 60% 40%",
              "50% 50% 40% 60% / 60% 40% 50% 50%",
            ],
          }}
          transition={{ duration: 50, repeat: Infinity, ease: "easeInOut" }}
          style={{ top: "45%", right: "25%" }}
        />
      </div>
    </div>
  );
}
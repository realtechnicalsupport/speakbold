import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export const FloatingNodes = () => {
  const [nodes, setNodes] = useState<{ id: number; x: number; y: number; size: number; duration: number; delay: number }[]>([]);

  useEffect(() => {
    const newNodes = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    }));
    setNodes(newNodes);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden hidden md:block">
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          initial={{ 
            x: `${node.x}%`, 
            y: `${node.y}%`, 
            opacity: 0,
            scale: 0.5 
          }}
          animate={{
            x: [
              `${node.x}%`, 
              `${(node.x + 10) % 100}%`, 
              `${(node.x - 5) % 100}%`, 
              `${node.x}%`
            ],
            y: [
              `${node.y}%`, 
              `${(node.y - 15) % 100}%`, 
              `${(node.y + 10) % 100}%`, 
              `${node.y}%`
            ],
            opacity: [0.05, 0.15, 0.05],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: node.duration,
            repeat: Infinity,
            ease: "linear",
            delay: node.delay,
          }}
          className="absolute bg-primary rounded-full blur-[1px]"
          style={{
            width: node.size,
            height: node.size,
          }}
        />
      ))}
      
      {/* Subtle background glow blobs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.05, 0.1, 0.05],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.03, 0.08, 0.03],
          x: [0, -40, 0],
          y: [0, -50, 0],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]"
      />
    </div>
  );
};

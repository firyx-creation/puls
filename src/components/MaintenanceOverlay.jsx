import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function MaintenanceOverlay({ message, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-background border border-border rounded-2xl p-8 max-w-md mx-4 shadow-2xl"
      >
        <div className="flex justify-center mb-4">
          <div className="bg-destructive/20 p-4 rounded-full">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-3">
          Maintenance en cours
        </h2>

        <p className="text-muted-foreground text-center mb-6 leading-relaxed">
          {message}
        </p>

        <button
          onClick={onClose}
          className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold hover:opacity-90 transition-opacity"
        >
          Ok
        </button>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Merci de ta patience 💙
        </p>
      </motion.div>
    </motion.div>
  );
}

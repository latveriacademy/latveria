import React, { useState } from "react";
import { X, Delete } from "lucide-react";
import { sound } from "../utils/audioFeedback";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";

export const LatveriaCalculator = ({ isOpen, onClose, isAllowed = true }) => {
  const [display, setDisplay] = useState("0");
  const [prevValue, setPrevValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [forceEnabled, setForceEnabled] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit) => {
    sound.playClick();
    if (waitingForOperand) {
      setDisplay(String(digit));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? String(digit) : display + digit);
    }
  };

  const handleDecimal = () => {
    sound.playClick();
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const handleClear = () => {
    sound.playClick();
    setDisplay("0");
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const handleBackspace = () => {
    sound.playClick();
    if (waitingForOperand) return;
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  };

  const handleSign = () => {
    sound.playClick();
    const val = parseFloat(display);
    if (val !== 0) {
      setDisplay(String(-val));
    }
  };

  const handlePercent = () => {
    sound.playClick();
    const val = parseFloat(display);
    setDisplay(String(val / 100));
  };

  const performOperation = (nextOp) => {
    sound.playClick();
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (operation) {
      const currentValue = prevValue || 0;
      let newValue = currentValue;

      switch (operation) {
        case "+":
          newValue = currentValue + inputValue;
          break;
        case "-":
          newValue = currentValue - inputValue;
          break;
        case "×":
          newValue = currentValue * inputValue;
          break;
        case "÷":
          newValue = inputValue !== 0 ? currentValue / inputValue : "Error";
          break;
        default:
          break;
      }

      setPrevValue(newValue);
      setDisplay(String(newValue).slice(0, 12));
    }

    setWaitingForOperand(true);
    setOperation(nextOp);
  };

  const handleEquals = () => {
    sound.playSelect();
    if (!operation || prevValue === null) return;

    const inputValue = parseFloat(display);
    const currentValue = prevValue;
    let newValue = currentValue;

    switch (operation) {
      case "+":
        newValue = currentValue + inputValue;
        break;
      case "-":
        newValue = currentValue - inputValue;
        break;
      case "×":
        newValue = currentValue * inputValue;
        break;
      case "÷":
        newValue = inputValue !== 0 ? currentValue / inputValue : "Error";
        break;
      default:
        break;
    }

    setDisplay(String(newValue).slice(0, 12));
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  };

  const calculatorActive = isAllowed || forceEnabled;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      modal={false}
    >
      <DialogContent
        className="latveria-calculator-floating"
        showCloseButton={false}
        aria-describedby={undefined}
        style={{ top: "auto", left: "auto", transform: "none", padding: 0 }}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="calc-header-drag">
          <DialogTitle className="calc-brand font-mono">
            <span className="calc-dot" />
            <span>LATVERIA // CALC-01 ANALYTICAL</span>
          </DialogTitle>
          <div className="calc-controls">
            <button
              type="button"
              className="calc-btn-close"
              onClick={onClose}
              title="Tutup Kalkulator"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {!calculatorActive ? (
          <div className="calc-disabled-notice font-sans">
            <div className="calc-notice-badge font-mono">STANDARDIZED PROTOCOL</div>
            <h4 className="font-serif">CALCULATOR UNAVAILABLE FOR THIS SESSION</h4>
            <p className="notice-sub">
              Subtes ini menguji penalaran verbal/logika murni tanpa bantuan komputasi numerik.
            </p>
            <button
              type="button"
              className="btn-latveria-secondary btn-override font-mono"
              onClick={() => setForceEnabled(true)}
            >
              AKTIFKAN UNTUK LATIHAN BEBAS
            </button>
          </div>
        ) : (
          <div className="calc-body">
            {/* LCD Digital Display */}
            <div className="calc-display-box font-mono">
              <div className="calc-display-equation">
                {prevValue !== null && `${prevValue} ${operation || ""}`}
              </div>
              <div className="calc-display-main">{display}</div>
            </div>

            {/* Keypad Grid */}
            <div className="calc-keypad-grid font-mono">
              <button type="button" className="calc-key op-key" onClick={handleClear}>
                C
              </button>
              <button type="button" className="calc-key op-key" onClick={handleSign}>
                ±
              </button>
              <button type="button" className="calc-key op-key" onClick={handlePercent}>
                %
              </button>
              <button
                type="button"
                className="calc-key op-key math-key"
                onClick={() => performOperation("÷")}
              >
                ÷
              </button>

              <button type="button" className="calc-key num-key" onClick={() => handleDigit(7)}>
                7
              </button>
              <button type="button" className="calc-key num-key" onClick={() => handleDigit(8)}>
                8
              </button>
              <button type="button" className="calc-key num-key" onClick={() => handleDigit(9)}>
                9
              </button>
              <button
                type="button"
                className="calc-key op-key math-key"
                onClick={() => performOperation("×")}
              >
                ×
              </button>

              <button type="button" className="calc-key num-key" onClick={() => handleDigit(4)}>
                4
              </button>
              <button type="button" className="calc-key num-key" onClick={() => handleDigit(5)}>
                5
              </button>
              <button type="button" className="calc-key num-key" onClick={() => handleDigit(6)}>
                6
              </button>
              <button
                type="button"
                className="calc-key op-key math-key"
                onClick={() => performOperation("-")}
              >
                -
              </button>

              <button type="button" className="calc-key num-key" onClick={() => handleDigit(1)}>
                1
              </button>
              <button type="button" className="calc-key num-key" onClick={() => handleDigit(2)}>
                2
              </button>
              <button type="button" className="calc-key num-key" onClick={() => handleDigit(3)}>
                3
              </button>
              <button
                type="button"
                className="calc-key op-key math-key"
                onClick={() => performOperation("+")}
              >
                +
              </button>

              <button type="button" className="calc-key num-key" onClick={() => handleDigit(0)}>
                0
              </button>
              <button type="button" className="calc-key num-key" onClick={handleDecimal}>
                .
              </button>
              <button type="button" className="calc-key op-key" onClick={handleBackspace}>
                <Delete size={14} />
              </button>
              <button type="button" className="calc-key eq-key" onClick={handleEquals}>
                =
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

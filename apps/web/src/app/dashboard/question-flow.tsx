"use client";

import { useState } from "react";
import Link from "next/link";
import { List } from "lucide-react";
import { MathText } from "../../components/math-text";
import styles from "./dashboard.module.css";

export type PracticeQuestion = { id: string; prompt: string; options: string[] };
export type ReviewQuestion = PracticeQuestion & { correctAnswer: number; selectedAnswer: number; isCorrect: number; explanation: string };

type Props = {
  mode: "attempt";
  items: PracticeQuestion[];
  action: (form: FormData) => void;
} | {
  mode: "review";
  items: ReviewQuestion[];
  current: number;
  backHref: string;
};

export function QuestionFlow(props: Props) {
  const [current, setCurrent] = useState(props.mode === "review" ? props.current : 0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const item = props.items[current];
  if (!item) return null;
  const reviewMode = props.mode === "review";
  const reviewItems = reviewMode ? props.items as ReviewQuestion[] : undefined;

  const answered = !reviewMode
    ? props.items.map((question) => answers[question.id] !== undefined)
    : reviewItems!.map((question) => question.selectedAnswer !== null);
  const jump = (index: number) => {
    setCurrent(index);
    setPickerOpen(false);
  };
  const navigator = <aside className={styles.navigatorPanel} aria-label="Navigasi soal">
    <h2>Soal</h2>
    <nav className={styles.questionNumbers} aria-label="Pilih nomor soal">
      {props.items.map((question, index) => {
        const active = index === current;
        const isAnswered = answered[index];
        const reviewClass = reviewMode && isAnswered ? reviewItems![index].isCorrect ? styles.navCorrect : styles.navIncorrect : "";
        return <button className={`${styles.questionNumber} ${isAnswered ? styles.navAnswered : ""} ${active ? styles.navActive : ""} ${reviewClass}`} type="button" aria-label={`Soal ${index + 1}${isAnswered ? ", sudah dijawab" : ", belum dijawab"}${active ? ", sedang dibuka" : ""}`} aria-current={active ? "step" : undefined} key={question.id} onClick={() => jump(index)}>{index + 1}</button>;
      })}
    </nav>
  </aside>;

  const questionContent = <article className={styles.singleQuestion} key={item.id}>
    {reviewMode && <div className={styles.reviewQuestionHeading}><h2><MathText>{item.prompt}</MathText></h2><span className={reviewItems![current].isCorrect ? styles.correct : styles.incorrect}>{reviewItems![current].isCorrect ? "Benar" : "Salah"}</span></div>}
    {!reviewMode && <h2 className={styles.attemptPrompt}><MathText>{item.prompt}</MathText></h2>}
    <ul className={styles.answerOptions}>
      {item.options.map((option, optionIndex) => {
        const selected = !reviewMode ? answers[item.id] === optionIndex : reviewItems![current].selectedAnswer === optionIndex;
        const correct = reviewMode && reviewItems![current].correctAnswer === optionIndex;
        const stateClass = reviewMode ? correct ? styles.answerCorrect : selected ? styles.answerWrong : "" : selected ? styles.answerSelected : "";
        return <li className={`${styles.answerOption} ${stateClass}`} key={`${optionIndex}-${option}`}>
          <label>
            {!reviewMode && <input type="radio" name={`visible-answer-${item.id}`} checked={selected} onChange={() => setAnswers((existing) => ({ ...existing, [item.id]: optionIndex }))} />}
            <span className={styles.optionLetter}>{String.fromCharCode(65 + optionIndex)}</span>
            <span className={styles.optionText}><MathText>{option}</MathText></span>
            {reviewMode && selected && <strong>Jawabanmu</strong>}
            {reviewMode && correct && <strong>Jawaban benar</strong>}
          </label>
        </li>;
      })}
    </ul>
    {reviewMode && <section className={styles.explanation}><h3>Pembahasan</h3><dl>
      <div><dt>Jawaban yang benar</dt><dd><MathText>{reviewItems![current].options[reviewItems![current].correctAnswer]}</MathText></dd></div>
      <div><dt>Konsep dan penerapan</dt><dd><MathText>{reviewItems![current].explanation}</MathText></dd></div>
    </dl><p className={styles.conclusion}>Kesimpulan: {reviewItems![current].isCorrect ? "Jawabanmu benar." : `Jawaban yang tepat adalah ${reviewItems![current].options[reviewItems![current].correctAnswer]}.`}</p></section>}
  </article>;

  if (reviewMode) {
    const href = (number: number) => `${props.backHref.split("?")[0]}?soal=${number + 1}`;
    return <section className={styles.questionFlow}>
      <div className={styles.questionMain}><p className={styles.questionProgress}>Soal {current + 1} dari {props.items.length} <span className={reviewItems![current].isCorrect ? styles.correct : styles.incorrect}>{reviewItems![current].isCorrect ? "Benar" : "Salah"}</span></p><MobileQuestionPicker open={pickerOpen} onOpen={() => setPickerOpen(true)} onClose={() => setPickerOpen(false)} current={current} answered={answered} reviewItems={reviewItems} onJump={jump} />{questionContent}
        <div className={styles.questionControls}><Link aria-disabled={current === 0} className={current === 0 ? styles.controlDisabled : undefined} href={href(Math.max(0, current - 1))}>Sebelumnya</Link>{current < props.items.length - 1 ? <Link href={href(current + 1)}>Berikutnya</Link> : <Link href={props.backHref}>Kembali ke riwayat</Link>}</div>
      </div>
      {navigator}
    </section>;
  }

  const action = props.action;
  const formAction = async (form: FormData) => {
    for (const question of props.items) {
      const value = answers[question.id];
      if (value !== undefined) form.set(`answer-${question.id}`, String(value));
    }
    await action(form);
  };

  return <form action={formAction} className={styles.questionFlow}>
    {props.items.map((question) => <input key={question.id} type="hidden" name={`answer-${question.id}`} value={answers[question.id] ?? ""} />)}
    <div className={styles.questionMain}><p className={styles.questionProgress}>Soal {current + 1} dari {props.items.length}</p><MobileQuestionPicker open={pickerOpen} onOpen={() => setPickerOpen(true)} onClose={() => setPickerOpen(false)} current={current} answered={answered} onJump={jump} />{questionContent}
      <div className={styles.questionControls}><button type="button" disabled={current === 0} onClick={() => jump(current - 1)}>Sebelumnya</button>{current < props.items.length - 1 ? <button type="button" onClick={() => jump(current + 1)}>Berikutnya</button> : <button type="submit">Kumpulkan jawaban</button>}</div>
    </div>
    {navigator}
  </form>;
}

function MobileQuestionPicker({ open, onOpen, onClose, current, answered, reviewItems, onJump }: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  current: number;
  answered: boolean[];
  reviewItems?: ReviewQuestion[];
  onJump: (index: number) => void;
}) {
  return <div className={styles.mobilePicker}>
    <button className={styles.mobilePickerTrigger} type="button" aria-expanded={open} onClick={onOpen}><List />Pilih nomor soal</button>
    {open && <div className={styles.pickerBackdrop} role="presentation" onClick={onClose}><section className={styles.pickerSheet} role="dialog" aria-modal="true" aria-labelledby="question-picker-title" onClick={(event) => event.stopPropagation()}>
      <div className={styles.pickerHeader}><h2 id="question-picker-title">Soal</h2><button type="button" onClick={onClose}>Tutup</button></div>
      <div className={styles.pickerGrid}>{answered.map((isAnswered, index) => {
        const result = reviewItems?.[index];
        const state = result ? result.isCorrect ? styles.navCorrect : styles.navIncorrect : isAnswered ? styles.navAnswered : "";
        return <button className={`${styles.questionNumber} ${state} ${current === index ? styles.navActive : ""}`} key={index} type="button" aria-label={`Soal ${index + 1}${isAnswered ? ", sudah dijawab" : ", belum dijawab"}`} aria-current={current === index ? "step" : undefined} onClick={() => onJump(index)}>{index + 1}</button>;
      })}</div>
      <p className={styles.pickerLegend}><span className={styles.legendAnswered} /> Sudah dijawab <span className={styles.legendActive} /> Sedang dibuka</p>
    </section></div>}
  </div>;
}

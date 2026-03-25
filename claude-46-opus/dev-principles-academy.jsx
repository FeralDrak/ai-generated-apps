import { useState, useEffect, useRef } from "react";

const PRINCIPLES = {
  S: {
    letter: "S",
    name: "Single Responsibility",
    acronym: "SOLID",
    color: "#FF6B35",
    summary: "Une classe ne doit avoir qu'une seule raison de changer.",
    explanation:
      "Chaque module ou classe doit être responsable d'une seule fonctionnalité. Si une classe fait trop de choses, elle devient fragile : un changement dans une responsabilité peut casser les autres.",
    badCode: `class UserManager {
  createUser(data) { /* ... */ }
  sendEmail(user) { /* ... */ }
  generatePDF(user) { /* ... */ }
  logActivity(action) { /* ... */ }
}
// 💀 4 raisons de changer !`,
    goodCode: `class UserService {
  createUser(data) { /* ... */ }
}
class EmailService {
  send(to, content) { /* ... */ }
}
class PDFGenerator {
  generate(data) { /* ... */ }
}
// ✅ Chaque classe = 1 job`,
    quiz: {
      question: "Quel code viole le principe SRP ?",
      options: [
        { text: "class Logger { log(msg) {} }", correct: false },
        {
          text: "class Order { calculate() {} save() {} sendEmail() {} }",
          correct: true,
        },
        { text: "class Validator { validate(input) {} }", correct: false },
      ],
      explanation:
        "Order a 3 responsabilités : calcul, persistance et notification. Il faudrait les séparer.",
    },
  },
  O: {
    letter: "O",
    name: "Open/Closed",
    acronym: "SOLID",
    color: "#F7C548",
    summary: "Ouvert à l'extension, fermé à la modification.",
    explanation:
      "On doit pouvoir ajouter de nouveaux comportements sans modifier le code existant. On y parvient via l'abstraction, le polymorphisme ou la composition.",
    badCode: `function getDiscount(type) {
  if (type === 'student') return 0.2;
  if (type === 'senior') return 0.3;
  if (type === 'vip')     return 0.4;
  // Ajouter un type = modifier la fn 😬
}`,
    goodCode: `const discountStrategies = {
  student: () => 0.2,
  senior:  () => 0.3,
  vip:     () => 0.4,
};
// Ajouter un type = ajouter une clé ✅
function getDiscount(type) {
  return discountStrategies[type]?.() ?? 0;
}`,
    quiz: {
      question: "Que signifie 'fermé à la modification' ?",
      options: [
        { text: "Le fichier doit être en lecture seule", correct: false },
        {
          text: "On ne devrait pas avoir à changer le code existant pour ajouter une feature",
          correct: true,
        },
        {
          text: "On ne peut plus jamais toucher au code une fois mergé",
          correct: false,
        },
      ],
      explanation:
        "On étend le comportement via l'abstraction, sans toucher au code déjà testé et en production.",
    },
  },
  L: {
    letter: "L",
    name: "Liskov Substitution",
    acronym: "SOLID",
    color: "#2EC4B6",
    summary:
      "Un objet enfant doit pouvoir remplacer son parent sans casser le programme.",
    explanation:
      "Si S est un sous-type de T, alors tout objet de type T peut être remplacé par un objet de type S sans altérer le comportement attendu. Violation classique : un Carré qui hérite de Rectangle.",
    badCode: `class Rectangle {
  setWidth(w)  { this.w = w; }
  setHeight(h) { this.h = h; }
  area() { return this.w * this.h; }
}
class Square extends Rectangle {
  setWidth(w)  { this.w = w; this.h = w; }
  setHeight(h) { this.w = h; this.h = h; }
}
// 💀 Square casse le contrat de Rectangle`,
    goodCode: `class Shape {
  area() { throw 'implement me'; }
}
class Rectangle extends Shape {
  constructor(w, h) { super(); this.w = w; this.h = h; }
  area() { return this.w * this.h; }
}
class Square extends Shape {
  constructor(s) { super(); this.s = s; }
  area() { return this.s * this.s; }
}
// ✅ Pas de relation parent/enfant trompeuse`,
    quiz: {
      question: "Pourquoi Square extends Rectangle est problématique ?",
      options: [
        {
          text: "Parce que Square modifie le comportement attendu de setWidth/setHeight",
          correct: true,
        },
        {
          text: "Parce que les carrés n'existent pas en programmation",
          correct: false,
        },
        { text: "Parce que l'héritage est toujours mauvais", correct: false },
      ],
      explanation:
        "Modifier width change aussi height dans Square, ce qui viole le contrat implicite de Rectangle.",
    },
  },
  I: {
    letter: "I",
    name: "Interface Segregation",
    acronym: "SOLID",
    color: "#9B5DE5",
    summary:
      "Mieux vaut plusieurs petites interfaces qu'une seule interface massive.",
    explanation:
      "Un client ne devrait pas être forcé de dépendre de méthodes qu'il n'utilise pas. Découpez les interfaces \"grasses\" en interfaces spécialisées.",
    badCode: `interface Worker {
  work(): void;
  eat(): void;
  sleep(): void;
  attendMeeting(): void;
}
// 💀 Un robot doit implémenter eat() 
//    et sleep() ?`,
    goodCode: `interface Workable {
  work(): void;
}
interface Feedable {
  eat(): void;
}
interface Restable {
  sleep(): void;
}
// ✅ Le robot implémente uniquement
//    Workable`,
    quiz: {
      question: "Quel est le signe d'une interface trop large ?",
      options: [
        { text: "Elle a plus de 3 méthodes", correct: false },
        {
          text: "Des classes sont forcées d'implémenter des méthodes inutiles pour elles",
          correct: true,
        },
        { text: "Elle utilise des génériques", correct: false },
      ],
      explanation:
        "Le signal d'alerte : des méthodes implémentées avec throw 'not implemented' ou return null.",
    },
  },
  D: {
    letter: "D",
    name: "Dependency Inversion",
    acronym: "SOLID",
    color: "#E84855",
    summary:
      "Dépendre des abstractions, pas des implémentations concrètes.",
    explanation:
      "Les modules de haut niveau ne doivent pas dépendre des modules de bas niveau. Les deux doivent dépendre d'abstractions. Cela rend le code testable et découplé.",
    badCode: `class OrderService {
  constructor() {
    this.db = new MySQLDatabase();
    this.mailer = new SendGridMailer();
  }
}
// 💀 Couplé à MySQL et SendGrid
//    Impossible à tester unitairement`,
    goodCode: `class OrderService {
  constructor(db, mailer) {
    this.db = db;       // n'importe quel DB
    this.mailer = mailer; // n'importe quel mailer
  }
}
// ✅ Injection de dépendances
//    Mock facile en test`,
    quiz: {
      question:
        "Quel avantage principal apporte l'injection de dépendances ?",
      options: [
        { text: "Le code s'exécute plus vite", correct: false },
        { text: "On peut mocker les dépendances dans les tests", correct: true },
        { text: "On n'a plus besoin de base de données", correct: false },
      ],
      explanation:
        "En injectant des abstractions, on peut substituer des mocks en test et changer d'implémentation sans toucher au code métier.",
    },
  },
  DRY: {
    letter: "DRY",
    name: "Don't Repeat Yourself",
    acronym: "DRY",
    color: "#06D6A0",
    summary: "Chaque connaissance doit avoir une représentation unique et non-ambiguë.",
    explanation:
      "La duplication de logique crée un cauchemar de maintenance : corriger un bug à un endroit sans le corriger partout. Attention : DRY concerne la duplication de *connaissance*, pas la duplication de *code*. Deux fonctions identiques mais servant des domaines différents ne violent pas DRY.",
    badCode: `// Dans user-service.js
function isValidEmail(email) {
  return /^[^@]+@[^@]+\\.[^@]+$/.test(email);
}
// Dans order-service.js (copié-collé)
function isValidEmail(email) {
  return /^[^@]+@[^@]+\\.[^@]+$/.test(email);
}
// 💀 Bug fixé dans un seul fichier...`,
    goodCode: `// validation.js \u2014 source unique
export function isValidEmail(email) {
  return /^[^@]+@[^@]+\\.[^@]+$/.test(email);
}
// Import\u00e9 partout
// import { isValidEmail } from 'validation'
// \u2705 Un seul endroit \u00e0 maintenir`,
    quiz: {
      question: "Quand la duplication de code est-elle acceptable ?",
      options: [
        { text: "Jamais, c'est toujours mauvais", correct: false },
        {
          text: "Quand deux morceaux de code identiques servent des domaines différents et évolueront indépendamment",
          correct: true,
        },
        {
          text: "Quand on est pressé par une deadline",
          correct: false,
        },
      ],
      explanation:
        "DRY concerne la duplication de connaissance. Deux bouts de code identiques mais aux raisons de changer différentes ne violent pas DRY.",
    },
  },
  KISS: {
    letter: "KISS",
    name: "Keep It Simple, Stupid",
    acronym: "KISS",
    color: "#118AB2",
    summary: "La simplicité est la sophistication suprême.",
    explanation:
      "La complexité accidentelle est l'ennemi n°1 de la maintenabilité. Privilégiez la solution la plus simple qui résout le problème. Un code clever est rarement un bon code — il doit être lisible par un humain fatigué un vendredi à 17h.",
    badCode: `// "Clever" one-liner
const r = a.reduce((p,c,i) =>
  (i%2 ? {...p, [a[i-1]]:c} : p), {});

// 💀 Qu'est-ce que ça fait ? 
//    Bonne chance en code review.`,
    goodCode: `// Intention claire
function arrayToObject(pairs) {
  const result = {};
  for (let i = 0; i < pairs.length; i += 2) {
    const key = pairs[i];
    const value = pairs[i + 1];
    result[key] = value;
  }
  return result;
}
// ✅ Lisible, debuggable, maintenable`,
    quiz: {
      question: "Quel est le principal danger du code 'clever' ?",
      options: [
        { text: "Il est plus lent à l'exécution", correct: false },
        {
          text: "Il est difficile à comprendre, debugger et maintenir",
          correct: true,
        },
        {
          text: "Il utilise trop de mémoire",
          correct: false,
        },
      ],
      explanation:
        "Le code est lu bien plus souvent qu'il n'est écrit. La lisibilité prime sur l'élégance cryptique.",
    },
  },
  YAGNI: {
    letter: "YAGNI",
    name: "You Ain't Gonna Need It",
    acronym: "YAGNI",
    color: "#FF006E",
    summary: "N'implémentez pas une fonctionnalité tant qu'elle n'est pas nécessaire.",
    explanation:
      "Résistez à la tentation d'anticiper des besoins futurs hypothétiques. Le code spéculatif coûte : temps de développement, maintenance, complexité. Si le besoin se concrétise, vous l'implémenterez. Sinon, vous aurez économisé du temps.",
    badCode: `class UserService {
  createUser(data) { /* ... */ }
  createBulkUsers(list) { /* ... */ }
  importFromCSV(file) { /* ... */ }
  importFromXML(file) { /* ... */ }
  syncWithLDAP() { /* ... */ }
}
// 💀 Le client a juste demandé createUser
//    Le reste est spéculatif`,
    goodCode: `class UserService {
  createUser(data) {
    // Implémentation solide et testée
    // du seul besoin réel actuel
  }
}
// ✅ Quand le bulk import sera demandé,
//    on l'ajoutera. Pas avant.`,
    quiz: {
      question: 'Quel est le coût caché du code "au cas où" ?',
      options: [
        { text: "Aucun, c'est du temps bien investi", correct: false },
        { text: "Juste un peu de place sur le disque", correct: false },
        {
          text: "Maintenance, complexité accrue et tests supplémentaires pour du code peut-être inutile",
          correct: true,
        },
      ],
      explanation:
        "Chaque ligne de code a un coût de maintenance. Du code spéculatif = de la dette technique gratuite.",
    },
  },
};

const PRINCIPLE_KEYS = ["S", "O", "L", "I", "D", "DRY", "KISS", "YAGNI"];

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M4 10.5L8 14.5L16 6.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const ArrowIcon = ({ dir }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ transform: dir === "left" ? "rotate(180deg)" : "none" }}>
    <path d="M4 9H14M14 9L9.5 4.5M14 9L9.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TrophyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <path d="M16 38H32M24 30V38M12 8H36V14C36 22.8366 30.6274 30 24 30C17.3726 30 12 22.8366 12 14V8Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 12H8C8 18 10 22 14 22M36 12H40C40 18 38 22 34 22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function CodeBlock({ code, variant }) {
  return (
    <div style={{
      background: variant === "bad" ? "rgba(232,72,85,0.08)" : "rgba(6,214,160,0.08)",
      border: `1px solid ${variant === "bad" ? "rgba(232,72,85,0.25)" : "rgba(6,214,160,0.25)"}`,
      borderRadius: 12,
      padding: "16px 18px",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 12.5,
      lineHeight: 1.65,
      whiteSpace: "pre",
      overflowX: "auto",
      color: "var(--text)",
      position: "relative",
    }}>
      <span style={{
        position: "absolute", top: 8, right: 12,
        fontSize: 10, fontWeight: 700, letterSpacing: 1,
        textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif",
        color: variant === "bad" ? "#E84855" : "#06D6A0",
        opacity: 0.8,
      }}>
        {variant === "bad" ? "❌ Avant" : "✅ Après"}
      </span>
      {code}
    </div>
  );
}

function QuizCard({ quiz, answered, setAnswered, principleColor }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    if (quiz.options[idx].correct) setAnswered(true);
  };

  return (
    <div style={{
      background: "var(--card-bg)",
      borderRadius: 16,
      padding: 24,
      border: "1px solid var(--border)",
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
        textTransform: "uppercase", color: principleColor,
        marginBottom: 12, fontFamily: "'DM Sans', sans-serif",
      }}>
        Quiz
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 18, lineHeight: 1.5 }}>
        {quiz.question}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {quiz.options.map((opt, idx) => {
          const isSelected = selected === idx;
          const showResult = selected !== null;
          const isCorrect = opt.correct;
          let bg = "var(--option-bg)";
          let border = "1px solid var(--border)";
          let textColor = "var(--text)";
          if (showResult && isCorrect) {
            bg = "rgba(6,214,160,0.12)";
            border = "1.5px solid #06D6A0";
          } else if (showResult && isSelected && !isCorrect) {
            bg = "rgba(232,72,85,0.12)";
            border = "1.5px solid #E84855";
          }
          return (
            <button key={idx} onClick={() => handleSelect(idx)} style={{
              background: bg, border, borderRadius: 10, padding: "12px 16px",
              cursor: selected !== null ? "default" : "pointer",
              textAlign: "left", fontSize: 14, color: textColor,
              display: "flex", alignItems: "center", gap: 10,
              transition: "all 0.2s",
              fontFamily: "'DM Sans', sans-serif",
              opacity: showResult && !isCorrect && !isSelected ? 0.5 : 1,
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, flexShrink: 0,
                background: showResult && isCorrect ? "#06D6A0" : showResult && isSelected ? "#E84855" : principleColor + "22",
                color: showResult && (isCorrect || isSelected) ? "#fff" : principleColor,
              }}>
                {showResult && isCorrect ? <CheckIcon /> : showResult && isSelected ? <XIcon /> : String.fromCharCode(65 + idx)}
              </span>
              <span style={{ lineHeight: 1.4 }}>{opt.text}</span>
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <div style={{
          marginTop: 16, padding: "14px 16px", borderRadius: 10,
          background: "var(--explanation-bg)",
          fontSize: 13.5, lineHeight: 1.6, color: "var(--text-secondary)",
          borderLeft: `3px solid ${principleColor}`,
        }}>
          💡 {quiz.explanation}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ current, total, completedSet }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {PRINCIPLE_KEYS.map((key, idx) => {
        const p = PRINCIPLES[key];
        const isActive = idx === current;
        const isDone = completedSet.has(key);
        return (
          <div key={key} style={{
            height: 6,
            flex: 1,
            borderRadius: 3,
            background: isDone ? p.color : isActive ? p.color + "66" : "var(--border)",
            transition: "all 0.4s ease",
            position: "relative",
          }}>
            {isActive && (
              <div style={{
                position: "absolute", top: -1, left: 0, right: 0, bottom: -1,
                borderRadius: 4,
                boxShadow: `0 0 8px ${p.color}55`,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CompletionScreen({ score, total, onRestart }) {
  const pct = Math.round((score / total) * 100);
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", textAlign: "center", padding: "48px 24px",
      minHeight: 400,
    }}>
      <div style={{ color: "#F7C548", marginBottom: 16 }}>
        <TrophyIcon />
      </div>
      <h2 style={{
        fontSize: 28, fontWeight: 800, color: "var(--text)",
        fontFamily: "'Space Grotesk', sans-serif", margin: "0 0 8px",
      }}>
        Parcours terminé !
      </h2>
      <p style={{ fontSize: 16, color: "var(--text-secondary)", margin: "0 0 32px", lineHeight: 1.5 }}>
        Score : <strong style={{ color: pct >= 75 ? "#06D6A0" : pct >= 50 ? "#F7C548" : "#E84855" }}>{score}/{total}</strong> quiz réussis du premier coup
      </p>
      <div style={{
        width: 200, height: 200, borderRadius: "50%",
        background: `conic-gradient(#06D6A0 ${pct}%, var(--border) ${pct}%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 32,
      }}>
        <div style={{
          width: 160, height: 160, borderRadius: "50%",
          background: "var(--bg)", display: "flex", alignItems: "center",
          justifyContent: "center", flexDirection: "column",
        }}>
          <span style={{ fontSize: 42, fontWeight: 800, color: "var(--text)", fontFamily: "'Space Grotesk', sans-serif" }}>
            {pct}%
          </span>
        </div>
      </div>
      <button onClick={onRestart} style={{
        background: "linear-gradient(135deg, #FF6B35, #E84855)",
        color: "#fff", border: "none", borderRadius: 12,
        padding: "14px 32px", fontSize: 15, fontWeight: 700,
        cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
        letterSpacing: 0.5,
      }}>
        Recommencer
      </button>
    </div>
  );
}

export default function App() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [tab, setTab] = useState("learn");
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [completed, setCompleted] = useState(new Set());
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const contentRef = useRef(null);

  const currentKey = PRINCIPLE_KEYS[currentIdx];
  const principle = PRINCIPLES[currentKey];

  useEffect(() => {
    setTab("learn");
    setQuizAnswered(false);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [currentIdx]);

  const handleNext = () => {
    const newCompleted = new Set(completed);
    newCompleted.add(currentKey);
    setCompleted(newCompleted);
    if (currentIdx < PRINCIPLE_KEYS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const handleQuizAnswer = (val) => {
    setQuizAnswered(true);
    if (val && !completed.has(currentKey)) {
      setFirstTryCorrect((p) => p + 1);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setTab("learn");
    setQuizAnswered(false);
    setCompleted(new Set());
    setFirstTryCorrect(0);
    setFinished(false);
  };

  const solidLetters = ["S", "O", "L", "I", "D"];

  return (
    <div style={{
      "--bg": "#0F1117",
      "--card-bg": "#181B25",
      "--border": "#2A2D3A",
      "--text": "#E8E9ED",
      "--text-secondary": "#9395A1",
      "--option-bg": "#1E2130",
      "--explanation-bg": "#1A1D2A",
      fontFamily: "'DM Sans', sans-serif",
      background: "var(--bg)",
      color: "var(--text)",
      minHeight: "100vh",
      maxWidth: 720,
      margin: "0 auto",
      padding: "20px 16px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          display: "inline-flex", gap: 3, marginBottom: 10,
          background: "var(--card-bg)", borderRadius: 12, padding: "8px 14px",
          border: "1px solid var(--border)",
        }}>
          {solidLetters.map((l) => (
            <span key={l} style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22, fontWeight: 800, color: PRINCIPLES[l].color,
              opacity: !finished && currentKey === l ? 1 : completed.has(l) ? 0.9 : 0.3,
              transition: "opacity 0.3s",
            }}>
              {l}
            </span>
          ))}
          <span style={{ color: "var(--text-secondary)", fontSize: 22, fontWeight: 300, margin: "0 6px" }}>+</span>
          {["DRY", "KISS", "YAGNI"].map((l) => (
            <span key={l} style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 13, fontWeight: 700, color: PRINCIPLES[l].color,
              opacity: !finished && currentKey === l ? 1 : completed.has(l) ? 0.9 : 0.3,
              transition: "opacity 0.3s",
              alignSelf: "center", marginLeft: 2,
            }}>
              {l}
            </span>
          ))}
        </div>
        <h1 style={{
          fontSize: 14, fontWeight: 600, color: "var(--text-secondary)",
          margin: 0, letterSpacing: 0.5,
        }}>
          Dev Principles Academy
        </h1>
      </div>

      {/* Progress */}
      {!finished && (
        <div style={{ marginBottom: 24 }}>
          <ProgressBar current={currentIdx} total={PRINCIPLE_KEYS.length} completedSet={completed} />
          <div style={{
            display: "flex", justifyContent: "space-between", marginTop: 8,
            fontSize: 12, color: "var(--text-secondary)",
          }}>
            <span>{currentIdx + 1} / {PRINCIPLE_KEYS.length}</span>
            <span>{completed.size} complété{completed.size > 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      {finished ? (
        <CompletionScreen score={firstTryCorrect} total={PRINCIPLE_KEYS.length} onRestart={handleRestart} />
      ) : (
        <>
          {/* Principle Header */}
          <div style={{
            background: "var(--card-bg)",
            borderRadius: 16,
            padding: 24,
            marginBottom: 16,
            border: "1px solid var(--border)",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: -20, right: -10,
              fontSize: 120, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif",
              color: principle.color, opacity: 0.06, lineHeight: 1, userSelect: "none",
            }}>
              {principle.letter}
            </div>
            <div style={{
              display: "inline-block", padding: "4px 10px", borderRadius: 6,
              background: principle.color + "18", color: principle.color,
              fontSize: 11, fontWeight: 700, letterSpacing: 1,
              textTransform: "uppercase", marginBottom: 10,
            }}>
              {principle.acronym}
            </div>
            <h2 style={{
              margin: "0 0 4px", fontSize: 24, fontWeight: 800,
              fontFamily: "'Space Grotesk', sans-serif", color: "var(--text)",
            }}>
              <span style={{ color: principle.color }}>{principle.letter}</span>
              {principle.name !== principle.letter ? " — " + principle.name : ""}
            </h2>
            <p style={{
              margin: 0, fontSize: 15, color: "var(--text-secondary)",
              lineHeight: 1.5, fontStyle: "italic",
            }}>
              « {principle.summary} »
            </p>
          </div>

          {/* Tabs */}
          <div style={{
            display: "flex", gap: 4, marginBottom: 16,
            background: "var(--card-bg)", borderRadius: 12, padding: 4,
            border: "1px solid var(--border)",
          }}>
            {[
              { key: "learn", label: "📖 Théorie" },
              { key: "code", label: "💻 Code" },
              { key: "quiz", label: "🧩 Quiz" },
            ].map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                flex: 1, padding: "10px 8px", border: "none", borderRadius: 9,
                background: tab === t.key ? principle.color + "22" : "transparent",
                color: tab === t.key ? principle.color : "var(--text-secondary)",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                transition: "all 0.25s",
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div ref={contentRef} style={{ marginBottom: 16 }}>
            {tab === "learn" && (
              <div style={{
                background: "var(--card-bg)", borderRadius: 16, padding: 24,
                border: "1px solid var(--border)", lineHeight: 1.7, fontSize: 14.5,
                color: "var(--text-secondary)",
              }}>
                {principle.explanation}
              </div>
            )}

            {tab === "code" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <CodeBlock code={principle.badCode} variant="bad" />
                <CodeBlock code={principle.goodCode} variant="good" />
              </div>
            )}

            {tab === "quiz" && (
              <QuizCard
                quiz={principle.quiz}
                answered={quizAnswered}
                setAnswered={handleQuizAnswer}
                principleColor={principle.color}
              />
            )}
          </div>

          {/* Navigation */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", gap: 12,
          }}>
            <button onClick={handlePrev} disabled={currentIdx === 0} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 18px", borderRadius: 10,
              background: "var(--card-bg)", border: "1px solid var(--border)",
              color: currentIdx === 0 ? "var(--border)" : "var(--text-secondary)",
              cursor: currentIdx === 0 ? "default" : "pointer",
              fontSize: 13, fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              <ArrowIcon dir="left" /> Préc.
            </button>

            <button onClick={handleNext} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 24px", borderRadius: 10,
              background: quizAnswered
                ? `linear-gradient(135deg, ${principle.color}, ${principle.color}cc)`
                : "var(--card-bg)",
              border: quizAnswered ? "none" : "1px solid var(--border)",
              color: quizAnswered ? "#fff" : "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 13, fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.3s",
            }}>
              {currentIdx === PRINCIPLE_KEYS.length - 1 ? "Terminer" : "Suiv."} <ArrowIcon dir="right" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export interface Module {
  id: string;
  title: string;
  description: string;
  duration: string;
  day: number;
  category: string;
  quizQuestions: QuizQuestion[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export const modules: Module[] = [
  {
    id: "praxissoftware",
    title: "Praxissoftware bedienen",
    description: "Lerne die wichtigsten Funktionen der Praxissoftware kennen: Patientenakte, Terminplanung, Dokumentation und Rezeptverwaltung.",
    duration: "45 Min",
    day: 5,
    category: "Grundlagen",
    quizQuestions: [
      {
        question: "Wo finden Sie die Patientenhistorie in der Praxissoftware?",
        options: ["Unter 'Abrechnung'", "Im Reiter 'Patientenakte'", "Unter 'Einstellungen'", "Im Kalender"],
        correctIndex: 1,
      },
      {
        question: "Wie erstellen Sie einen neuen Termin?",
        options: ["Über das Menü 'Datei'", "Im Kalender per Doppelklick", "Über die Suchfunktion", "Per Drag & Drop aus der Warteliste"],
        correctIndex: 1,
      },
      {
        question: "Was ist beim Erfassen eines Rezepts zu beachten?",
        options: ["Die Versicherungsnummer muss eingetragen werden", "Das Rezept muss ausgedruckt werden", "Dosierung und Dauer sind Pflichtfelder", "Der Patient muss anwesend sein"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "triage",
    title: "Triage am Telefon",
    description: "Medizinische Dringlichkeit richtig einschätzen: Entscheidungsbäume, Red Flags und korrekte Weiterleitung von Anrufen.",
    duration: "60 Min",
    day: 15,
    category: "Klinisch",
    quizQuestions: [
      {
        question: "Was ist ein 'Red Flag' bei Brustschmerzen?",
        options: ["Schmerz seit 3 Tagen", "Ausstrahlender Schmerz in den linken Arm", "Schmerz beim Husten", "Leichtes Stechen"],
        correctIndex: 1,
      },
      {
        question: "Wie priorisieren Sie einen Anruf mit Atemnot?",
        options: ["Normaler Termin morgen", "Sofortige Weiterleitung an den Arzt", "Rückruf in 2 Stunden", "Empfehlung: Apotheke aufsuchen"],
        correctIndex: 1,
      },
      {
        question: "Welche Information ist bei der Triage am wichtigsten?",
        options: ["Versicherungsstatus", "Aktueller Symptomverlauf", "Letzte Rechnung", "Beruf des Patienten"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "abrechnung",
    title: "Abrechnung TARMED",
    description: "Grundlagen der TARMED-Abrechnung: Leistungspositionen, Taxpunktwerte und korrekte Codierung.",
    duration: "90 Min",
    day: 25,
    category: "Administration",
    quizQuestions: [
      {
        question: "Was beschreibt der Taxpunktwert?",
        options: ["Die Anzahl der Patienten", "Den monetären Wert eines Taxpunktes", "Die Behandlungsdauer", "Den Versicherungstarif"],
        correctIndex: 1,
      },
      {
        question: "Welche Leistung wird unter TARMED Position 00.0010 erfasst?",
        options: ["Konsultation, erste 5 Min", "Laboranalyse", "Röntgenbild", "Impfung"],
        correctIndex: 0,
      },
      {
        question: "Was muss bei der Abrechnung immer angegeben werden?",
        options: ["Nur der Patientenname", "Position, Datum und Diagnose", "Nur die Diagnose", "Nur der Arztname"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "labor",
    title: "Laborwerte interpretieren",
    description: "Verstehe die wichtigsten Laborparameter und ihre klinische Bedeutung im Praxisalltag.",
    duration: "75 Min",
    day: 45,
    category: "Klinisch",
    quizQuestions: [
      {
        question: "Was zeigt ein erhöhter CRP-Wert an?",
        options: ["Dehydration", "Entzündung im Körper", "Leberschaden", "Nierenschwäche"],
        correctIndex: 1,
      },
      {
        question: "Welcher Laborwert ist für die Diabeteskontrolle relevant?",
        options: ["Kreatinin", "HbA1c", "TSH", "Hämoglobin"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "notfall",
    title: "Notfallmanagement",
    description: "Richtiges Verhalten bei Notfällen in der Praxis: BLS-Schema, Notfallkoffer und Teamkoordination.",
    duration: "60 Min",
    day: 75,
    category: "Klinisch",
    quizQuestions: [
      {
        question: "Was ist der erste Schritt bei einem kollabierten Patienten?",
        options: ["Blutdruck messen", "Ansprechen und Bewusstsein prüfen", "Sofort Adrenalin geben", "Fenster öffnen"],
        correctIndex: 1,
      },
      {
        question: "Wie oft soll bei der CPR komprimiert werden?",
        options: ["60x pro Minute", "80x pro Minute", "100-120x pro Minute", "140x pro Minute"],
        correctIndex: 2,
      },
    ],
  },
];

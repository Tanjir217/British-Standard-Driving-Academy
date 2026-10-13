export const lessons = [
  [
    "Beginner Driving",
    "Controls, steering, moving off, stopping, junctions and confident road positioning.",
  ],
  [
    "City & Traffic",
    "Urban traffic judgement, lane discipline, signals, parking and defensive driving.",
  ],
  [
    "Highway Confidence",
    "Higher-speed road awareness, merging, overtaking and safe following distances.",
  ],
  [
    "Test Preparation",
    "Theory-test support, mock practicals, common faults and final-day confidence.",
  ],
] as const;

export const instructors = [
  {
    id: "samir",
    name: "Samir Rahman",
    role: "Senior Instructor",
    specialty: "Beginner confidence & city driving",
    experience: "8+ years",
    languages: "English · বাংলা",
    initials: "SR",
    tone: "tone-red",
  },
  {
    id: "nabila",
    name: "Nabila Ahmed",
    role: "Driving Instructor",
    specialty: "Automatic lessons & calm coaching",
    experience: "6+ years",
    languages: "English · বাংলা",
    initials: "NA",
    tone: "tone-navy",
  },
  {
    id: "farhan",
    name: "Farhan Kabir",
    role: "Test Preparation Coach",
    specialty: "Mock tests & advanced road skills",
    experience: "9+ years",
    languages: "English · বাংলা",
    initials: "FK",
    tone: "tone-sand",
  },
  {
    id: "tania",
    name: "Tania Sultana",
    role: "Driving Instructor",
    specialty: "Refresher lessons & confidence building",
    experience: "5+ years",
    languages: "English · বাংলা",
    initials: "TS",
    tone: "tone-olive",
  },
] as const;

export const faqs = [
  [
    "How do I book a lesson?",
    "Choose a package, select a lesson service and available time, then submit your details. Payment and any required checkout step will follow the booking process.",
  ],
  [
    "Can I choose manual or automatic?",
    "Yes. BSDA can offer separate manual and automatic lesson options, subject to instructor and vehicle availability.",
  ],
  [
    "Can I book lessons individually?",
    "Yes. Pay-as-you-go lessons are available alongside discounted blocks for learners who prefer to commit to several hours.",
  ],
  [
    "Do you offer intensive courses?",
    "Yes. Intensive training can be structured around your target date, current experience and available instructor capacity.",
  ],
  [
    "Do you offer Pass Plus and motorway training?",
    "Yes. Pass Plus is a minimum six-hour DVSA course, while dedicated motorway and dual-carriageway sessions can be booked separately.",
  ],
  [
    "What is included on test day?",
    "A production test-day package can include a warm-up lesson, use of the academy car for the practical test and return journey, subject to availability.",
  ],
  [
    "What payment methods are available?",
    "The demo flow supports Bank Transfer and Pay by Bank. A production payment gateway can be connected through the final Wix implementation.",
  ],
  [
    "Is the Learning Portal included?",
    "Registered students receive portal access after enrollment. The current portal is a design preview of the intended student experience.",
  ],
] as const;

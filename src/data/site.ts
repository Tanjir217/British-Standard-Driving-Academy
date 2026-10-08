export const packages = [
  {
    id: "starter",
    name: "Starter",
    price: "£200",
    eyebrow: "5 Hours",
    description:
      "A flexible starting block for new learners or anyone returning to driving.",
    features: [
      "5 hours of practical tuition",
      "Manual or automatic",
      "Progress assessment",
      "Flexible scheduling",
      "Instructor feedback",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    price: "£390",
    eyebrow: "10 Hours",
    popular: true,
    description:
      "Our core block for consistent weekly progress at a better hourly rate.",
    features: [
      "10 hours of practical tuition",
      "Manual or automatic",
      "Theory-test guidance",
      "Progress tracking",
      "Priority scheduling",
      "Same-instructor continuity",
    ],
  },
  {
    id: "intensive",
    name: "Intensive",
    price: "£780",
    eyebrow: "20 Hours",
    description:
      "A focused programme for learners working towards test readiness on a shorter timeline.",
    features: [
      "20 hours of intensive tuition",
      "Manual or automatic",
      "Mock practical preparation",
      "Personal learning plan",
      "Test-route practice",
      "Priority instructor access",
    ],
  },
];

export const services = [
  {
    name: "Pay-as-you-go lessons",
    price: "From £40/hr",
    description:
      "Flexible one-hour tuition for learners who prefer to book lesson by lesson.",
  },
  {
    name: "Automatic lessons",
    price: "From £43/hr",
    description:
      "Automatic tuition for new learners, nervous drivers and licence holders choosing an automatic vehicle.",
  },
  {
    name: "10-hour block",
    price: "£390 manual",
    description:
      "A discounted block with priority scheduling and consistent instructor support.",
  },
  {
    name: "Motorway & dual carriageway",
    price: "£45/hr",
    description:
      "Confidence-building training for motorway, dual carriageway and higher-speed road driving.",
  },
  {
    name: "Refresher lessons",
    price: "From £40/hr",
    description:
      "Targeted support for qualified drivers returning to driving or rebuilding confidence.",
  },
  {
    name: "Pass Plus",
    price: "£270 / 6 hours",
    description:
      "Post-test training covering town, all-weather, rural, night, dual carriageway and motorway driving.",
  },
  {
    name: "Mock practical test",
    price: "£65",
    description:
      "A full rehearsal with examiner-style marking, feedback and a clear readiness report.",
  },
  {
    name: "Test-day car hire",
    price: "£100",
    description:
      "Use the academy car for your practical test with a warm-up session beforehand.",
  },
] as const;

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

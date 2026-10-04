export const packages = [
  { id:"starter", name:"Starter", price:"৳ 3,500", eyebrow:"Beginner", description:"A confident first step for new learners.", features:["3 practical lessons","Road-safety fundamentals","Instructor assessment","Flexible scheduling"] },
  { id:"standard", name:"Standard", price:"৳ 8,500", eyebrow:"Most Popular", popular:true, description:"A structured path from beginner to road-ready.", features:["8 practical lessons","Theory guidance","Mock practical assessment","Progress tracking","Priority scheduling"] },
  { id:"intensive", name:"Intensive", price:"৳ 15,500", eyebrow:"Fast Track", description:"Focused training for learners with a target date.", features:["15 practical lessons","Theory + practical coaching","Mock test preparation","Priority instructor access","Personal learning plan"] }
];

export const lessons = [
  ["Beginner Driving","Controls, steering, moving off, stopping, junctions and confident road positioning."],
  ["City & Traffic","Urban traffic judgement, lane discipline, signals, parking and defensive driving."],
  ["Highway Confidence","Higher-speed road awareness, merging, overtaking and safe following distances."],
  ["Test Preparation","Theory-test support, mock practicals, common faults and final-day confidence."]
] as const;

export const instructors = [
  { id:"samir", name:"Samir Rahman", role:"Senior Instructor", specialty:"Beginner confidence & city driving", experience:"8+ years", languages:"English · বাংলা", initials:"SR", tone:"tone-red" },
  { id:"nabila", name:"Nabila Ahmed", role:"Driving Instructor", specialty:"Automatic lessons & calm coaching", experience:"6+ years", languages:"English · বাংলা", initials:"NA", tone:"tone-navy" },
  { id:"farhan", name:"Farhan Kabir", role:"Test Preparation Coach", specialty:"Mock tests & advanced road skills", experience:"9+ years", languages:"English · বাংলা", initials:"FK", tone:"tone-sand" },
  { id:"tania", name:"Tania Sultana", role:"Driving Instructor", specialty:"Refresher lessons & confidence building", experience:"5+ years", languages:"English · বাংলা", initials:"TS", tone:"tone-olive" }
] as const;

export const faqs = [
  ["How do I book a lesson?","Choose a package, submit your details and select your preferred payment method. Our team confirms your lesson schedule after payment verification."],
  ["Can I ask questions before paying?","Yes. Use the inquiry form on the booking page to tell us about your experience, preferred lesson type and target date."],
  ["What payment methods are available?","The demo flow supports Bank Transfer and Pay by Bank. A production payment gateway can be connected through the final Wix implementation."],
  ["Is the Learning Portal included?","Registered students receive portal access after enrollment. The current portal is a design preview of the intended student experience."],
  ["Can I change my lesson time?","Yes, subject to instructor availability. Contact the academy as early as possible for schedule changes."],
  ["Do you provide theory-test preparation?","Yes. Theory-test guidance and practice material are part of the planned Learning Portal experience."]
] as const;

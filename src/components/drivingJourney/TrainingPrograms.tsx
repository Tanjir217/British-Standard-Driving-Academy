export function TrainingPrograms() {
  return (
    <div className="journeyTrainingCards">
      {[
        ["01", "Beginner Driving", "Build control, observation and road confidence from the fundamentals."],
        ["02", "Advanced Driving", "Sharpen judgement, positioning and decision-making in complex traffic."],
        ["03", "Highway Training", "Develop calm, safe habits for higher-speed roads and long journeys."],
        ["04", "Defensive Driving", "Read hazards earlier and create safer margins around your vehicle."],
      ].map(([number, title, text]) => (
        <article key={number} className="journeyTrainingCard">
          <span>{number}</span>
          <h3>{title}</h3>
          <p>{text}</p>
        </article>
      ))}
    </div>
  );
}

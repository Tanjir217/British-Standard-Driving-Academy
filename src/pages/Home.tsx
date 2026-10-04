import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Heading } from "../components/Heading";
import { Reveal } from "../components/Reveal";
import { SocialFeed } from "../components/SocialFeed";
import { VideoShowcase } from "../components/VideoShowcase";
import { PackageCard } from "../components/PackageCard";
import { LessonCard } from "../components/LessonCard";
import { InstructorCard } from "../components/InstructorCard";
import { FAQSection } from "../components/FAQSection";
import { packages, lessons, instructors } from "../data/site";

export function Home() {
  return (
    <>
      <section className="hero">
        <div className="container herogrid">
          <div className="heroCopy">
            <span className="ey">British-standard driving education</span>
            <h1>Learn to drive.<br /><em>Learn to live.</em></h1>
            <p>Confident drivers are built through patient coaching, purposeful practice and a learning path that makes every lesson count.</p>
            <div className="actions">
              <Link className="btn red" to="/booking">Book your first lesson <Icon n="arrow" /></Link>
              <Link className="btn light" to="/instructors">Meet our instructors</Link>
            </div>
            <div className="heroTrust">
              <span><Icon n="shield" s={16} /> Safety-first coaching</span>
              <span><Icon n="car" s={16} /> Practical road skills</span>
              <span><Icon n="calendar" s={16} /> Flexible scheduling</span>
            </div>
          </div>

          <div className="heroart">
            <div className="heroRing ringone" />
            <div className="heroRing ringtwo" />
            <div className="heroFrame">
              <div className="heroSky" />
              <div className="heroBuilding bOne" />
              <div className="heroBuilding bTwo" />
              <div className="heroRoad" />
              <div className="heroDash dashOne" />
              <div className="heroDash dashTwo" />
              <div className="heroDash dashThree" />
              <div className="heroCar" />
              <div className="heroFramecopy"><small>YOUR NEXT MILE</small><b>Starts here.</b></div>
            </div>
            <div className="floatingCard">
              <span className="ey">Learning path</span>
              <b>Beginner → Road-ready</b>
              <i><span /></i>
            </div>
          </div>
        </div>

        <div className="container heroNumbers">
          <div><b>01</b><span>Clear learning path</span></div>
          <div><b>02</b><span>Instructor-led practice</span></div>
          <div><b>03</b><span>Test-ready confidence</span></div>
          <div><b>04</b><span>Support beyond the lesson</span></div>
        </div>
      </section>

      <section className="journey section">
        <div className="container">
          <div className="sectionIntro">
            <Heading ey="The BSDA journey" title="From first controls to confident road decisions." text="The experience is designed around progression. You always know what you are learning, why it matters and what comes next." />
            <span className="sectionNumber">01</span>
          </div>
          <div className="journeygrid">
            {[
              ["01","Assess","Start with your experience, confidence and goals."],
              ["02","Learn","Build vehicle control and road awareness with your instructor."],
              ["03","Practise","Repeat the right skills in real traffic and changing conditions."],
              ["04","Perform","Refine test technique and become an independent road user."]
            ].map((item, index) => (
              <Reveal key={item[1]} delay={index * 80}>
                <article className="journeycard">
                  <span>{item[0]}</span>
                  <h3>{item[1]}</h3>
                  <p>{item[2]}</p>
                  <i><Icon n="arrow" s={15} /></i>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="offerstrip">
        <div className="container offerin">
          <div><span className="ey">New learner offer</span><h2>Choose your pace. Keep your progress.</h2></div>
          <div><strong>3 / 8 / 15</strong><span>lesson paths</span></div>
          <Link className="btn white" to="/packages">See packages <Icon n="arrow" /></Link>
        </div>
      </section>

      <section className="section soft">
        <div className="container">
          <div className="sectionIntro">
            <Heading center ey="Choose your path" title="Training built around your goal." text="Start small, train consistently or choose an intensive path when time matters." />
            <span className="sectionNumber">02</span>
          </div>
          <div className="cards">
            {packages.map((p, i) => (
              <Reveal key={p.id} delay={i * 90}><PackageCard p={p} /></Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <Reveal>
            <Heading ey="Why BSDA" title="A driving school should teach more than test manoeuvres." text="We combine vehicle control, road awareness, decision-making and calm feedback so learners can carry their skills into everyday driving." />
            <div className="featureRows">
              <div><b>01</b><span><strong>Learn at your level</strong><small>Beginner, refresher, intensive or test preparation.</small></span></div>
              <div><b>02</b><span><strong>Train with purpose</strong><small>Each lesson has a clear target and a next-step recommendation.</small></span></div>
              <div><b>03</b><span><strong>Build lasting confidence</strong><small>Feedback and repetition turn isolated skills into safe habits.</small></span></div>
            </div>
          </Reveal>
          <Reveal delay={120}><SocialFeed /></Reveal>
        </div>
      </section>

      <section className="section dark">
        <div className="container">
          <div className="sectionIntro">
            <Heading ey="Lesson system" title="Skills that matter beyond the test." text="Four focused lesson paths cover the fundamentals and the situations learners need most." />
            <span className="sectionNumber lightNumber">03</span>
          </div>
          <div className="lessoncards">
            {lessons.map((l, i) => (
              <Reveal key={l[0]} delay={i * 80}><LessonCard lesson={l} index={i} /></Reveal>
            ))}
          </div>
          <div className="darklink"><Link className="textlink" to="/lessons">Explore the full lesson system <Icon n="arrow" s={15} /></Link></div>
        </div>
      </section>

      <section className="section videoSection">
        <div className="container">
          <div className="sectionIntro">
            <Heading center ey="Inside the learning journey" title="Focused lessons. Real road confidence." text="A visual layer brings movement to the experience without getting in the way of the information." />
            <span className="sectionNumber">04</span>
          </div>
          <Reveal><VideoShowcase /></Reveal>
        </div>
      </section>

      <section className="section instructorsPreview">
        <div className="container">
          <div className="sectionIntro">
            <Heading ey="Meet the instructors" title="The right coach can change the whole learning experience." text="Choose by teaching style, specialty and the kind of support you want from lesson one." />
            <span className="sectionNumber">05</span>
          </div>
          <div className="instructorgrid preview">
            {instructors.slice(0, 3).map((instructor, i) => (
              <Reveal key={instructor.id} delay={i * 90}><InstructorCard instructor={instructor} /></Reveal>
            ))}
          </div>
          <div className="centerlink"><Link className="btn light" to="/instructors">Meet all instructors <Icon n="arrow" /></Link></div>
        </div>
      </section>

      <section className="testimonials">
        <div className="container testimonialgrid">
          <div>
            <span className="ey">Learner feedback</span>
            <h2>“The goal is not just passing. It is knowing what to do when the road changes.”</h2>
          </div>
          <div className="quoteCards">
            <article><b>“</b><p>My lessons finally felt structured. I knew what I had improved and what I needed to practise next.</p><span>— Demo learner · Beginner</span></article>
            <article><b>“</b><p>The calm coaching made a huge difference. I became much more comfortable in busy traffic.</p><span>— Demo learner · Refresher</span></article>
          </div>
        </div>
      </section>

      <FAQSection />

      <section className="cta">
        <div className="container ctain">
          <div><span className="ey">Ready when you are</span><h2>Your first lesson is one decision away.</h2></div>
          <Link className="btn white" to="/booking">Start booking <Icon n="arrow" /></Link>
        </div>
      </section>
    </>
  );
}

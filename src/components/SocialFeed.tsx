import { Icon } from "./Icon";
export function SocialFeed() {
  return (
    <aside className="feed">
      <div className="feedtop">
        <div>
          <span className="ey">On the road</span>
          <h3>Practical learning notes</h3>
        </div>
        <i className="live" />
      </div>
      <div className="post">
        <strong>01</strong>
        <b>Start with control</b>
        <small>Beginner foundation</small>
        <p>
          Good driving starts with calm vehicle control, observation and clear
          decisions before the road gets busy.
        </p>
      </div>
      <div className="post">
        <div className="miniroad">
          <i />
        </div>
        <p>Practice, feedback, repeat — turn individual skills into safe, repeatable habits.</p>
      </div>
      <a className="textlink" href="/lessons">
        Explore lesson paths <Icon n="arrow" s={15} />
      </a>
    </aside>
  );
}

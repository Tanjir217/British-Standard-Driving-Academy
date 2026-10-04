import { Icon } from "./Icon";
export function SocialFeed() {
  return (
    <aside className="feed">
      <div className="feedtop">
        <div>
          <span className="ey">Stay connected</span>
          <h3>Social updates</h3>
        </div>
        <i className="live" />
      </div>
      <div className="post">
        <strong>BS</strong>
        <b>British Standard Driving Academy</b>
        <small>Latest update</small>
        <p>
          New learners deserve a calm start. Explore our packages and find the
          training path that fits your goals.
        </p>
        <span>♡ 42 &nbsp; ↗ Share</span>
      </div>
      <div className="post">
        <div className="miniroad">
          <i />
        </div>
        <p>Practice, feedback, repeat — that is how confidence is built.</p>
      </div>
      <a
        className="textlink"
        href="https://www.facebook.com/"
        target="_blank"
        rel="noreferrer"
      >
        Open Facebook <Icon n="arrow" s={15} />
      </a>
    </aside>
  );
}

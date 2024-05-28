import Post from "../post/Post";
import "./feed.css";
import ProfileHeader from "../profileHeader/ProfileHeader";
export default function Feed() {
  return (
    <div className="feed">
      <div className="feedWrapper">
        <ProfileHeader />

        <Post />
      </div>
    </div>
  );
}

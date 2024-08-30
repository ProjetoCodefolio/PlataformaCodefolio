import { useEffect, useState } from "react";
import { database } from "../../service/firebase";
import { ref, get } from "firebase/database";
import { useLocation } from 'react-router-dom';
import Header from "./Header";
import Post from "../../components/post/Post";

function MembroPage() {
    const [member, setMember] = useState([]);
    const location = useLocation();
    const uidUser = location.state?.uidUser;
    const [posts, setPosts] = useState([]);

    const getAllInfosMember = async (uidUser) => {
        const memberRef = ref(database, `users/${uidUser}`);
        const snapshot = await get(memberRef);
        return snapshot.val();
    };

    const fetchPosts = async () => {
        const postsQuery = ref(database, "post");

        const snapshot = await get(postsQuery);
        const postsData = snapshot.val();
        if (postsData) {
            const postsList = Object.keys(postsData).map((key) => ({
                id: key,
                ...postsData[key],
            })).reverse();

            const userPosts = postsList.filter(post => post.uidUser === uidUser);

            setPosts(userPosts);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    useEffect(() => {
        if (uidUser) {
            getAllInfosMember(uidUser).then((member) => {
                setMember(member);
            });
        }
    }, [uidUser]);

    const memberName = member.firstName + " " + member.lastName;

    return (
        <div>
            <Header nome={memberName} imagem={member.photoURL} quantidadePosts={posts.length} />
            <br /> <br />
            {<Post member={uidUser} />}
        </div>
    );
}

export default MembroPage;
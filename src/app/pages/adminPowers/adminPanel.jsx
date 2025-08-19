import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Tabs,
    Tab,
    Paper,
    Card,
    CardContent,
    CardActions,
    Button,
    Grid,
    CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Topbar from "$components/topbar/Topbar";
import { useAuth } from "$context/AuthContext";
import LockIcon from "@mui/icons-material/Lock";
import PinAccessModal from "$components/modals/PinAccessModal";
import { filterCoursesBySearchTerm } from "$api/services/courses/courses";
import {
    fetchCategorizedCourses,
    courseRequiresPin,
} from "$api/services/courses/list";
import AdminPanelComponent from "../../components/adminPanel";

const AdminPanel = () => {

    const options = [
        {
            id: 1,
            name: "Gerenciamento de Usuários",
            description: "Gerencie as permissões para cada usuário",
            path: "/admin-users"
        },
        {
            id: 2,
            name: "Gerenciamento de Cursos",
            description: "Gerencie os cursos ofertados pelos professores",
            path: "/admin-courses"
        },
        {
            id: 3,
            name: "Gerenciamento de Posts",
            description: "Gerencie os posts feitos pelos usuários",
            path: "/admin-posts"
        }
    ];
    return (
        <AdminPanelComponent options={options} />
    )
}

export default AdminPanel;
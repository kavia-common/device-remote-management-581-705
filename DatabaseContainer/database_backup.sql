--
-- PostgreSQL database dump
--

\restrict VGwAiMZz9lHJ0XRWyowEOofH5cMG6h1CwwZcYKYPsF5ttXZLGpE3a85vahNOHcp

-- Dumped from database version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE IF EXISTS myapp;
--
-- Name: myapp; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE myapp WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.UTF-8';


ALTER DATABASE myapp OWNER TO postgres;

\unrestrict VGwAiMZz9lHJ0XRWyowEOofH5cMG6h1CwwZcYKYPsF5ttXZLGpE3a85vahNOHcp
\connect myapp
\restrict VGwAiMZz9lHJ0XRWyowEOofH5cMG6h1CwwZcYKYPsF5ttXZLGpE3a85vahNOHcp

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: appuser
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(100) NOT NULL,
    resource_type character varying(50),
    resource_id integer,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address inet,
    user_agent text,
    session_id character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_logs OWNER TO appuser;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: appuser
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO appuser;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: appuser
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: devices; Type: TABLE; Schema: public; Owner: appuser
--

CREATE TABLE public.devices (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    device_type character varying(50) NOT NULL,
    ip_address inet,
    mac_address macaddr,
    serial_number character varying(255),
    model character varying(255),
    firmware_version character varying(255),
    status character varying(50) DEFAULT 'active'::character varying,
    user_id integer NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.devices OWNER TO appuser;

--
-- Name: devices_id_seq; Type: SEQUENCE; Schema: public; Owner: appuser
--

CREATE SEQUENCE public.devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.devices_id_seq OWNER TO appuser;

--
-- Name: devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: appuser
--

ALTER SEQUENCE public.devices_id_seq OWNED BY public.devices.id;


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: appuser
--

CREATE TABLE public.favorites (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    query_template jsonb NOT NULL,
    protocol_type character varying(20) NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb,
    is_shared boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT favorites_protocol_type_check CHECK (((protocol_type)::text = ANY ((ARRAY['SNMP'::character varying, 'WebPA'::character varying, 'TR69'::character varying, 'TR369'::character varying])::text[])))
);


ALTER TABLE public.favorites OWNER TO appuser;

--
-- Name: favorites_id_seq; Type: SEQUENCE; Schema: public; Owner: appuser
--

CREATE SEQUENCE public.favorites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.favorites_id_seq OWNER TO appuser;

--
-- Name: favorites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: appuser
--

ALTER SEQUENCE public.favorites_id_seq OWNED BY public.favorites.id;


--
-- Name: protocol_configs; Type: TABLE; Schema: public; Owner: appuser
--

CREATE TABLE public.protocol_configs (
    id integer NOT NULL,
    device_id integer NOT NULL,
    protocol_type character varying(20) NOT NULL,
    config_data jsonb NOT NULL,
    credentials jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT protocol_configs_protocol_type_check CHECK (((protocol_type)::text = ANY ((ARRAY['SNMP'::character varying, 'WebPA'::character varying, 'TR69'::character varying, 'TR369'::character varying])::text[])))
);


ALTER TABLE public.protocol_configs OWNER TO appuser;

--
-- Name: protocol_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: appuser
--

CREATE SEQUENCE public.protocol_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.protocol_configs_id_seq OWNER TO appuser;

--
-- Name: protocol_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: appuser
--

ALTER SEQUENCE public.protocol_configs_id_seq OWNED BY public.protocol_configs.id;


--
-- Name: query_history; Type: TABLE; Schema: public; Owner: appuser
--

CREATE TABLE public.query_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    device_id integer,
    protocol_type character varying(20) NOT NULL,
    query_type character varying(50) NOT NULL,
    query_data jsonb NOT NULL,
    response_data jsonb,
    status character varying(20) DEFAULT 'pending'::character varying,
    error_message text,
    execution_time_ms integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone,
    CONSTRAINT query_history_protocol_type_check CHECK (((protocol_type)::text = ANY ((ARRAY['SNMP'::character varying, 'WebPA'::character varying, 'TR69'::character varying, 'TR369'::character varying])::text[]))),
    CONSTRAINT query_history_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'running'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.query_history OWNER TO appuser;

--
-- Name: query_history_id_seq; Type: SEQUENCE; Schema: public; Owner: appuser
--

CREATE SEQUENCE public.query_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.query_history_id_seq OWNER TO appuser;

--
-- Name: query_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: appuser
--

ALTER SEQUENCE public.query_history_id_seq OWNED BY public.query_history.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: appuser
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    permissions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO appuser;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: appuser
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO appuser;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: appuser
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: appuser
--

CREATE TABLE public.user_roles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    role_id integer NOT NULL,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_by integer
);


ALTER TABLE public.user_roles OWNER TO appuser;

--
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: appuser
--

CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_roles_id_seq OWNER TO appuser;

--
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: appuser
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: appuser
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(255),
    last_name character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO appuser;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: appuser
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO appuser;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: appuser
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: devices id; Type: DEFAULT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.devices ALTER COLUMN id SET DEFAULT nextval('public.devices_id_seq'::regclass);


--
-- Name: favorites id; Type: DEFAULT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.favorites ALTER COLUMN id SET DEFAULT nextval('public.favorites_id_seq'::regclass);


--
-- Name: protocol_configs id; Type: DEFAULT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.protocol_configs ALTER COLUMN id SET DEFAULT nextval('public.protocol_configs_id_seq'::regclass);


--
-- Name: query_history id; Type: DEFAULT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.query_history ALTER COLUMN id SET DEFAULT nextval('public.query_history_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: appuser
--

COPY public.audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, session_id, created_at) FROM stdin;
1	1	login	user	1	{"success": true, "login_method": "password"}	127.0.0.1	Mozilla/5.0 (Demo Browser)	\N	2026-02-10 07:22:27.953131+00
2	1	device_create	device	1	{"device_name": "Sample Router", "device_type": "router"}	127.0.0.1	\N	\N	2026-02-10 07:22:31.555092+00
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: appuser
--

COPY public.devices (id, name, description, device_type, ip_address, mac_address, serial_number, model, firmware_version, status, user_id, tags, metadata, created_at, updated_at) FROM stdin;
1	Sample Router	Demo SNMP-enabled router for testing	router	192.168.1.1	00:11:22:33:44:55	SR001234	DemoRouter-X1	2.1.4	active	1	["demo", "snmp", "router"]	{"location": "Demo Lab", "manufacturer": "DemoTech", "support_protocols": ["SNMP", "WebPA"]}	2026-02-10 07:22:01.348765+00	2026-02-10 07:22:01.348765+00
\.


--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: appuser
--

COPY public.favorites (id, user_id, name, description, query_template, protocol_type, tags, is_shared, created_at, updated_at) FROM stdin;
1	1	System Info Query	Basic system information retrieval via SNMP	{"oids": ["1.3.6.1.2.1.1.1.0", "1.3.6.1.2.1.1.3.0", "1.3.6.1.2.1.1.5.0"], "operation": "get"}	SNMP	["system", "basic"]	f	2026-02-10 07:22:14.669388+00	2026-02-10 07:22:14.669388+00
\.


--
-- Data for Name: protocol_configs; Type: TABLE DATA; Schema: public; Owner: appuser
--

COPY public.protocol_configs (id, device_id, protocol_type, config_data, credentials, is_active, created_at, updated_at) FROM stdin;
1	1	SNMP	{"port": 161, "retries": 3, "timeout": 5000, "version": "v2c"}	{"community": "public"}	t	2026-02-10 07:22:05.684761+00	2026-02-10 07:22:05.684761+00
2	1	WebPA	{"timeout": 10000, "endpoint": "http://192.168.1.1:8080/webpa"}	{"password": "password123", "username": "admin"}	t	2026-02-10 07:22:09.466854+00	2026-02-10 07:22:09.466854+00
\.


--
-- Data for Name: query_history; Type: TABLE DATA; Schema: public; Owner: appuser
--

COPY public.query_history (id, user_id, device_id, protocol_type, query_type, query_data, response_data, status, error_message, execution_time_ms, created_at, completed_at) FROM stdin;
1	1	1	SNMP	get	{"oids": ["1.3.6.1.2.1.1.1.0"]}	{"1.3.6.1.2.1.1.1.0": "DemoRouter-X1 System Description"}	completed	\N	250	2026-02-10 07:22:23.673212+00	2026-02-10 06:22:23.673212+00
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: appuser
--

COPY public.roles (id, name, description, permissions, created_at, updated_at) FROM stdin;
1	admin	System Administrator	{"users": ["create", "read", "update", "delete"], "system": ["manage"], "devices": ["create", "read", "update", "delete"], "protocols": ["create", "read", "update", "delete"]}	2026-02-10 07:21:42.406473+00	2026-02-10 07:21:42.406473+00
2	user	Standard User	{"devices": ["create", "read", "update"], "protocols": ["read", "execute"]}	2026-02-10 07:21:45.472034+00	2026-02-10 07:21:45.472034+00
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: appuser
--

COPY public.user_roles (id, user_id, role_id, assigned_at, assigned_by) FROM stdin;
1	1	1	2026-02-10 07:21:55.259531+00	1
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: appuser
--

COPY public.users (id, username, email, password_hash, first_name, last_name, is_active, created_at, updated_at) FROM stdin;
1	admin	admin@devicemanagement.com	$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VppT9CqAu	System	Administrator	t	2026-02-10 07:21:52.114397+00	2026-02-10 07:21:52.114397+00
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: appuser
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 2, true);


--
-- Name: devices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: appuser
--

SELECT pg_catalog.setval('public.devices_id_seq', 1, true);


--
-- Name: favorites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: appuser
--

SELECT pg_catalog.setval('public.favorites_id_seq', 1, true);


--
-- Name: protocol_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: appuser
--

SELECT pg_catalog.setval('public.protocol_configs_id_seq', 2, true);


--
-- Name: query_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: appuser
--

SELECT pg_catalog.setval('public.query_history_id_seq', 1, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: appuser
--

SELECT pg_catalog.setval('public.roles_id_seq', 2, true);


--
-- Name: user_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: appuser
--

SELECT pg_catalog.setval('public.user_roles_id_seq', 1, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: appuser
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: protocol_configs protocol_configs_device_id_protocol_type_key; Type: CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.protocol_configs
    ADD CONSTRAINT protocol_configs_device_id_protocol_type_key UNIQUE (device_id, protocol_type);


--
-- Name: protocol_configs protocol_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.protocol_configs
    ADD CONSTRAINT protocol_configs_pkey PRIMARY KEY (id);


--
-- Name: query_history query_history_pkey; Type: CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.query_history
    ADD CONSTRAINT query_history_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_id_key UNIQUE (user_id, role_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: appuser
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: appuser
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: appuser
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_devices_ip_address; Type: INDEX; Schema: public; Owner: appuser
--

CREATE INDEX idx_devices_ip_address ON public.devices USING btree (ip_address);


--
-- Name: idx_devices_user_id; Type: INDEX; Schema: public; Owner: appuser
--

CREATE INDEX idx_devices_user_id ON public.devices USING btree (user_id);


--
-- Name: idx_favorites_user_id; Type: INDEX; Schema: public; Owner: appuser
--

CREATE INDEX idx_favorites_user_id ON public.favorites USING btree (user_id);


--
-- Name: idx_protocol_configs_device_id; Type: INDEX; Schema: public; Owner: appuser
--

CREATE INDEX idx_protocol_configs_device_id ON public.protocol_configs USING btree (device_id);


--
-- Name: idx_protocol_configs_protocol_type; Type: INDEX; Schema: public; Owner: appuser
--

CREATE INDEX idx_protocol_configs_protocol_type ON public.protocol_configs USING btree (protocol_type);


--
-- Name: idx_query_history_created_at; Type: INDEX; Schema: public; Owner: appuser
--

CREATE INDEX idx_query_history_created_at ON public.query_history USING btree (created_at DESC);


--
-- Name: idx_query_history_status; Type: INDEX; Schema: public; Owner: appuser
--

CREATE INDEX idx_query_history_status ON public.query_history USING btree (status);


--
-- Name: idx_query_history_user_id; Type: INDEX; Schema: public; Owner: appuser
--

CREATE INDEX idx_query_history_user_id ON public.query_history USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: appuser
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: appuser
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: devices devices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: protocol_configs protocol_configs_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.protocol_configs
    ADD CONSTRAINT protocol_configs_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: query_history query_history_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.query_history
    ADD CONSTRAINT query_history_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE SET NULL;


--
-- Name: query_history query_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.query_history
    ADD CONSTRAINT query_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: appuser
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: DATABASE myapp; Type: ACL; Schema: -; Owner: postgres
--

GRANT ALL ON DATABASE myapp TO appuser;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO appuser;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO appuser;


--
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TYPES TO appuser;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO appuser;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO appuser;


--
-- PostgreSQL database dump complete
--

\unrestrict VGwAiMZz9lHJ0XRWyowEOofH5cMG6h1CwwZcYKYPsF5ttXZLGpE3a85vahNOHcp


--
-- PostgreSQL database dump
--

\restrict M6NzlC4ZGMQJa9H2PKNmtn1UhLCutH8wRQYXvMf95mg3EQQqQcwnmAjh9LrE8V3

-- Dumped from database version 18.4 (Debian 18.4-1.pgdg12+1)
-- Dumped by pg_dump version 18.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: yowell_db_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO yowell_db_user;

--
-- Name: AccountingEntryType; Type: TYPE; Schema: public; Owner: yowell_db_user
--

CREATE TYPE public."AccountingEntryType" AS ENUM (
    'INCOME',
    'EXPENSE'
);


ALTER TYPE public."AccountingEntryType" OWNER TO yowell_db_user;

--
-- Name: AppModulePermission; Type: TYPE; Schema: public; Owner: yowell_db_user
--

CREATE TYPE public."AppModulePermission" AS ENUM (
    'COMPTABILITE',
    'STOCK',
    'COURSE',
    'VENTE_CLIENTS'
);


ALTER TYPE public."AppModulePermission" OWNER TO yowell_db_user;

--
-- Name: JuiceVolume; Type: TYPE; Schema: public; Owner: yowell_db_user
--

CREATE TYPE public."JuiceVolume" AS ENUM (
    '1L',
    '250ml'
);


ALTER TYPE public."JuiceVolume" OWNER TO yowell_db_user;

--
-- Name: PaymentChannel; Type: TYPE; Schema: public; Owner: yowell_db_user
--

CREATE TYPE public."PaymentChannel" AS ENUM (
    'CASH',
    'OM',
    'WAVE'
);


ALTER TYPE public."PaymentChannel" OWNER TO yowell_db_user;

--
-- Name: SaleKind; Type: TYPE; Schema: public; Owner: yowell_db_user
--

CREATE TYPE public."SaleKind" AS ENUM (
    'SALE',
    'QUOTE'
);


ALTER TYPE public."SaleKind" OWNER TO yowell_db_user;

--
-- Name: SalePaymentStatus; Type: TYPE; Schema: public; Owner: yowell_db_user
--

CREATE TYPE public."SalePaymentStatus" AS ENUM (
    'PAID',
    'UNPAID'
);


ALTER TYPE public."SalePaymentStatus" OWNER TO yowell_db_user;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: yowell_db_user
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'STAFF'
);


ALTER TYPE public."UserRole" OWNER TO yowell_db_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AccountingState; Type: TABLE; Schema: public; Owner: yowell_db_user
--

CREATE TABLE public."AccountingState" (
    id text DEFAULT 'default'::text NOT NULL,
    caisse integer DEFAULT 19350 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    om integer DEFAULT 0 NOT NULL,
    wave integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."AccountingState" OWNER TO yowell_db_user;

--
-- Name: ActivityLog; Type: TABLE; Schema: public; Owner: yowell_db_user
--

CREATE TABLE public."ActivityLog" (
    id text NOT NULL,
    "userId" text,
    "userName" text NOT NULL,
    "userEmail" text NOT NULL,
    action text NOT NULL,
    summary text NOT NULL,
    method text NOT NULL,
    path text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ActivityLog" OWNER TO yowell_db_user;

--
-- Name: Client; Type: TABLE; Schema: public; Owner: yowell_db_user
--

CREATE TABLE public."Client" (
    id text NOT NULL,
    name text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    email text DEFAULT ''::text NOT NULL,
    address text DEFAULT ''::text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Client" OWNER TO yowell_db_user;

--
-- Name: DeliveryRun; Type: TABLE; Schema: public; Owner: yowell_db_user
--

CREATE TABLE public."DeliveryRun" (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "totalAmount" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "paymentChannel" public."PaymentChannel" DEFAULT 'CASH'::public."PaymentChannel" NOT NULL
);


ALTER TABLE public."DeliveryRun" OWNER TO yowell_db_user;

--
-- Name: DeliveryRunFee; Type: TABLE; Schema: public; Owner: yowell_db_user
--

CREATE TABLE public."DeliveryRunFee" (
    id text NOT NULL,
    "runId" text NOT NULL,
    label text NOT NULL,
    amount integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DeliveryRunFee" OWNER TO yowell_db_user;

--
-- Name: DeliveryRunItem; Type: TABLE; Schema: public; Owner: yowell_db_user
--

CREATE TABLE public."DeliveryRunItem" (
    id text NOT NULL,
    "runId" text NOT NULL,
    label text NOT NULL,
    quantity double precision NOT NULL,
    "unitPrice" integer NOT NULL,
    "lineTotal" integer NOT NULL,
    "hasRemaining" boolean,
    "remainingNote" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "initialRemainingStock" double precision
);


ALTER TABLE public."DeliveryRunItem" OWNER TO yowell_db_user;

--
-- Name: ManualAccountingEntry; Type: TABLE; Schema: public; Owner: yowell_db_user
--

CREATE TABLE public."ManualAccountingEntry" (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    label text NOT NULL,
    amount integer NOT NULL,
    type public."AccountingEntryType" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ManualAccountingEntry" OWNER TO yowell_db_user;

--
-- Name: Product; Type: TABLE; Schema: public; Owner: yowell_db_user
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Product" OWNER TO yowell_db_user;

--
-- Name: ProductFormat; Type: TABLE; Schema: public; Owner: yowell_db_user
--

CREATE TABLE public."ProductFormat" (
    id text NOT NULL,
    "productId" text NOT NULL,
    volume public."JuiceVolume" NOT NULL,
    price integer NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    "minQuantity" integer DEFAULT 0 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProductFormat" OWNER TO yowell_db_user;

--
-- Name: ProductPhoto; Type: TABLE; Schema: public; Owner: yowell_db_user
--

CREATE TABLE public."ProductPhoto" (
    id text NOT NULL,
    "productId" text NOT NULL,
    url text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ProductPhoto" OWNER TO yowell_db_user;

--
-- Name: ProductionRecord; Type: TABLE; Schema: public; Owner: yowell_db_user
--

CREATE TABLE public."ProductionRecord" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "productName" text NOT NULL,
    volume public."JuiceVolume" NOT NULL,
    quantity integer NOT NULL,
    "producedAt" timestamp(3) without time zone NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ProductionRecord" OWNER TO yowell_db_user;

--
-- Name: Sale; Type: TABLE; Schema: public; Owner: yowell_db_user
--

CREATE TABLE public."Sale" (
    id text NOT NULL,
    "clientId" text NOT NULL,
    "clientName" text NOT NULL,
    "orderedAt" timestamp(3) without time zone NOT NULL,
    "totalAmount" integer NOT NULL,
    "paymentStatus" public."SalePaymentStatus" DEFAULT 'UNPAID'::public."SalePaymentStatus" NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "discountAmount" integer DEFAULT 0 NOT NULL,
    personalization boolean DEFAULT false NOT NULL,
    kind public."SaleKind" DEFAULT 'SALE'::public."SaleKind" NOT NULL,
    "paymentChannel" public."PaymentChannel"
);


ALTER TABLE public."Sale" OWNER TO yowell_db_user;

--
-- Name: SaleItem; Type: TABLE; Schema: public; Owner: yowell_db_user
--

CREATE TABLE public."SaleItem" (
    id text NOT NULL,
    "saleId" text NOT NULL,
    "productId" text NOT NULL,
    "productName" text NOT NULL,
    volume public."JuiceVolume" NOT NULL,
    quantity integer NOT NULL,
    "unitPrice" integer NOT NULL,
    "lineTotal" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SaleItem" OWNER TO yowell_db_user;

--
-- Name: User; Type: TABLE; Schema: public; Owner: yowell_db_user
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    "passwordHash" text NOT NULL,
    role public."UserRole" DEFAULT 'STAFF'::public."UserRole" NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    permissions public."AppModulePermission"[] DEFAULT ARRAY[]::public."AppModulePermission"[]
);


ALTER TABLE public."User" OWNER TO yowell_db_user;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: yowell_db_user
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO yowell_db_user;

--
-- Data for Name: AccountingState; Type: TABLE DATA; Schema: public; Owner: yowell_db_user
--

COPY public."AccountingState" (id, caisse, "createdAt", "updatedAt", om, wave) FROM stdin;
default	0	2026-05-27 00:39:07.589	2026-06-03 09:54:30.324	0	19530
\.


--
-- Data for Name: ActivityLog; Type: TABLE DATA; Schema: public; Owner: yowell_db_user
--

COPY public."ActivityLog" (id, "userId", "userName", "userEmail", action, summary, method, path, "createdAt") FROM stdin;
fa20a659-674f-4579-aa68-2142afe78bb1	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 10:53:52.966
25194a01-2121-4839-a7e9-44189385912c	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 11:03:41.146
4f2be712-ee52-4176-a9e5-61637f8c2af0	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 11:05:33.654
fa90b110-54b4-4570-9293-4ae21c2e0750	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 11:07:45.584
ae7ab2e4-31dd-45a5-a37f-bc380ad94e08	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 11:09:44.151
7016de1e-8704-49f4-ab34-f5be7682eb8f	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 11:12:41.344
e486947d-13c7-49f6-84ec-306c6224c35e	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 11:14:22.774
a67a69d1-e48e-4806-8fc4-51a1b230f73f	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 11:16:11.103
fc6e9ede-0f4e-434a-85f6-5da2bcacc11e	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 11:18:06.048
6ea73d21-add9-4759-a21a-74c7c347744c	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 11:20:29.056
54542cf5-8698-4610-ae66-7ce9637ce80d	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 11:23:43.902
9de2e296-7440-4855-aa49-41afa57136df	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 11:25:27.699
839060ec-0072-4745-bc15-f7ae4b5bcf3c	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 11:26:56.317
b6162c49-0dc6-4873-a90a-79db5651b73f	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 11:31:36.745
0978c627-666d-470d-a251-d3a03e58dfbe	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 11:32:54.044
4039cf63-e0c9-4904-9ef7-4bc9cc20c0e1	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 11:36:01.782
0d5090cc-d8da-454a-b9d2-e87c256bb7d5	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 11:37:29.491
0e8a35b1-dc8c-4022-afd0-6c99498f1c75	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 11:40:27.425
f55b081d-a3ad-4687-94d2-bd1bb1e324a8	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 11:41:58.483
2df078fc-c8b6-4d7f-abde-f548f8f345c6	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.productions	Enregistrement d'une production	POST	/api/stock/productions	2026-05-27 11:44:16.328
f2b5ce38-483e-4c99-a9f1-db69710e2e0e	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.productions	Enregistrement d'une production	POST	/api/stock/productions	2026-05-27 11:46:19.149
7904a6c5-edd7-4be6-b392-ded9ad3261bb	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	post.stock.productions	Enregistrement d'une production	POST	/api/stock/productions	2026-05-27 11:47:51.032
69db6e80-9cf5-44b7-b66d-156af7289682	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.deliveries	Enregistrement d'une course	POST	/api/deliveries	2026-05-27 12:27:31.278
dd06aea2-0e3e-4e50-b71d-9eff67c84144	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.b6477db0-a219-4b64-863c-bd225d6f6205	PATCH /api/deliveries/b6477db0-a219-4b64-863c-bd225d6f6205	PATCH	/api/deliveries/b6477db0-a219-4b64-863c-bd225d6f6205	2026-05-27 12:43:43.669
8d746d01-789f-4554-85cd-cc5cc032a8a0	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.deliveries	Enregistrement d'une course	POST	/api/deliveries	2026-05-27 12:47:00.979
24299b5e-4fd3-4ec6-bfb4-2ff4d60fa46a	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.bf5678de-a268-4ef7-b42c-4ff7578276ea	PATCH /api/deliveries/bf5678de-a268-4ef7-b42c-4ff7578276ea	PATCH	/api/deliveries/bf5678de-a268-4ef7-b42c-4ff7578276ea	2026-05-27 12:47:23.611
ea3a9232-f3b7-4e51-b474-a9bce471ec5c	bf183b25-4024-47aa-9232-e33885d05dc6	Adja Fatimata Sy	adja@yowell.com	patch.deliveries.bf5678de-a268-4ef7-b42c-4ff7578276ea.remaining	Mise à jour des restants d'une course	PATCH	/api/deliveries/bf5678de-a268-4ef7-b42c-4ff7578276ea/remaining	2026-05-27 12:51:43.37
78c82cde-7569-4eb3-a481-335de0b28702	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.bf5678de-a268-4ef7-b42c-4ff7578276ea.remaining	Mise à jour des restants d'une course	PATCH	/api/deliveries/bf5678de-a268-4ef7-b42c-4ff7578276ea/remaining	2026-05-27 13:02:05.628
b963844b-b0d5-4d36-8c6b-5db0078354a3	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.bf5678de-a268-4ef7-b42c-4ff7578276ea.remaining	Mise à jour des restants d'une course	PATCH	/api/deliveries/bf5678de-a268-4ef7-b42c-4ff7578276ea/remaining	2026-05-27 13:02:20.869
56ec30eb-3dbd-4523-bbe3-e6b454d514df	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.bf5678de-a268-4ef7-b42c-4ff7578276ea.remaining	Mise à jour des restants d'une course	PATCH	/api/deliveries/bf5678de-a268-4ef7-b42c-4ff7578276ea/remaining	2026-05-27 13:02:40.97
eb115ef7-77a7-46a2-b600-5ce62ccba52b	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	delete.stock.products.e7a5e666-57bf-437a-a9c8-0b20af561180	Suppression d'un produit	DELETE	/api/stock/products/e7a5e666-57bf-437a-a9c8-0b20af561180	2026-05-27 13:56:51.677
e153ec06-145f-44f3-b43f-8e21ce689670	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.stock.products	Création d'un produit	POST	/api/stock/products	2026-05-27 13:59:39.773
92aa9e0d-1435-4a85-8078-11669bef7132	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.stock.productions	Enregistrement d'une production	POST	/api/stock/productions	2026-05-27 14:01:26.449
69084ffe-3e55-4a24-b29d-160eb9b9fd87	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.stock.productions	Enregistrement d'une production	POST	/api/stock/productions	2026-05-27 14:01:51.805
ab4d3c2b-2361-4043-bf55-cfa03bec3605	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.stock.productions	Enregistrement d'une production	POST	/api/stock/productions	2026-05-27 14:02:20.797
f2bc44f9-dc65-40d4-a7ae-20064c04e62f	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.stock.productions	Enregistrement d'une production	POST	/api/stock/productions	2026-05-27 14:02:44.362
a941ec26-cf45-474f-bb06-80690d2888d8	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	post.sales	Enregistrement d'une vente	POST	/api/sales	2026-05-28 07:26:49.598
8d56750e-c1ff-4307-8f39-3477477a56bd	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	patch.sales.582044fb-efb9-4269-b7d0-07b934006526.payment-status	Mise à jour du paiement d'une vente	PATCH	/api/sales/582044fb-efb9-4269-b7d0-07b934006526/payment-status	2026-05-28 07:26:55.383
3ac29c8a-2097-4630-b827-05c680f85073	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	post.sales	Enregistrement d'une vente	POST	/api/sales	2026-05-28 07:28:33.294
05c352b9-a3ab-44cb-b4e2-ca6a94a9db79	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	patch.sales.a4f5d3d5-4596-4a88-8985-9f4704e47a83.payment-status	Mise à jour du paiement d'une vente	PATCH	/api/sales/a4f5d3d5-4596-4a88-8985-9f4704e47a83/payment-status	2026-05-28 07:28:35.999
be9b7639-e879-4b84-8ea3-38a9b0277280	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	post.sales	Enregistrement d'une vente	POST	/api/sales	2026-05-28 07:30:36.734
ebbbabc6-6628-4d31-840d-33eb7aefaee1	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	post.sales	Enregistrement d'une vente	POST	/api/sales	2026-05-28 07:35:03.854
9924c2db-2f69-4ebf-bac1-742bdec45b12	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	patch.sales.19ba709c-fe03-42dd-9743-441155b4671e.payment-status	Mise à jour du paiement d'une vente	PATCH	/api/sales/19ba709c-fe03-42dd-9743-441155b4671e/payment-status	2026-05-28 07:35:06.783
0d1f46fa-e61c-440c-9075-2c5f375cc3da	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	post.sales	Enregistrement d'une vente	POST	/api/sales	2026-05-28 07:36:22.81
d2301a48-8777-4445-b228-b815e27db093	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	patch.sales.07e219e7-cf47-407c-89a4-b44c64359cc5.payment-status	Mise à jour du paiement d'une vente	PATCH	/api/sales/07e219e7-cf47-407c-89a4-b44c64359cc5/payment-status	2026-05-28 07:36:26.73
be642a83-981d-41b9-af7c-69d5b48943ab	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	post.sales	Enregistrement d'une vente	POST	/api/sales	2026-05-28 07:38:06.27
85713c20-9c19-4b5b-af7a-fd30e3ff7f9b	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	post.sales	Enregistrement d'une vente	POST	/api/sales	2026-05-28 07:40:02.671
0ad26b4b-f34b-4910-b7e4-32411b07ff4d	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.sales	Enregistrement d'une vente ou d'un devis	POST	/api/sales	2026-05-30 15:09:21.326
67153c47-6cc9-4816-b3e6-1c9ecf0e0122	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	get.sales.8184a0c8-9596-4d76-b5b5-565caa911c8f.invoice	Téléchargement d'une facture ou d'un devis	GET	/api/sales/8184a0c8-9596-4d76-b5b5-565caa911c8f/invoice	2026-05-30 15:09:36.598
d8336eaa-cd8e-4f73-a411-df08a1083efa	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	patch.sales.cfc59ba9-c5ab-4b99-9180-390cc8d79ade.payment-status	Mise à jour du paiement d'une vente	PATCH	/api/sales/cfc59ba9-c5ab-4b99-9180-390cc8d79ade/payment-status	2026-05-31 23:30:20.312
1de0137a-e360-4f45-928e-4d9a97b69514	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	patch.sales.bf4ad353-99c9-4835-b4c7-9e4ad8cf616b.payment-status	Mise à jour du paiement d'une vente	PATCH	/api/sales/bf4ad353-99c9-4835-b4c7-9e4ad8cf616b/payment-status	2026-05-31 23:40:27.728
0ee479ba-3a99-4c57-8101-8b7ad037e550	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.accounting.balances	Mise à jour des soldes par canal	PATCH	/api/accounting/balances	2026-06-01 14:51:18.589
c06c5499-3f6f-4c38-b1d7-bd79dbd3a7ce	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.b6477db0-a219-4b64-863c-bd225d6f6205	Modification d'une course	PATCH	/api/deliveries/b6477db0-a219-4b64-863c-bd225d6f6205	2026-06-01 14:56:04.176
3d3d4f94-85ad-4991-98df-14b43e239377	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.sales.07e219e7-cf47-407c-89a4-b44c64359cc5	Modification d'une vente	PATCH	/api/sales/07e219e7-cf47-407c-89a4-b44c64359cc5	2026-06-01 14:57:12.173
a4de807c-9adf-4c6f-b4bb-b35e3ee43b0c	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.sales.cfc59ba9-c5ab-4b99-9180-390cc8d79ade	Modification d'une vente	PATCH	/api/sales/cfc59ba9-c5ab-4b99-9180-390cc8d79ade	2026-06-01 14:59:29.577
7f0494e6-e023-429d-a866-9613ae40bead	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.sales.bf4ad353-99c9-4835-b4c7-9e4ad8cf616b	Modification d'une vente	PATCH	/api/sales/bf4ad353-99c9-4835-b4c7-9e4ad8cf616b	2026-06-01 15:16:18.774
887cc983-d75d-4083-8876-24a1b9f120eb	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.sales.a4f5d3d5-4596-4a88-8985-9f4704e47a83	Modification d'une vente	PATCH	/api/sales/a4f5d3d5-4596-4a88-8985-9f4704e47a83	2026-06-01 15:16:47.975
80c475a8-506f-4f79-bf4f-1b8be038aed1	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.sales.a4f5d3d5-4596-4a88-8985-9f4704e47a83	Modification d'une vente	PATCH	/api/sales/a4f5d3d5-4596-4a88-8985-9f4704e47a83	2026-06-01 15:17:10.674
edcb58e5-b54f-4886-8ffb-8cba09933299	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	patch.sales.b2e31b93-0f1f-401c-9893-6b6408843a17.payment-status	Mise à jour du paiement d'une vente	PATCH	/api/sales/b2e31b93-0f1f-401c-9893-6b6408843a17/payment-status	2026-06-01 22:27:02.087
4efd89ae-c3dd-4ca0-a2db-66af86de8679	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	patch.stock.products.d24067c1-44bb-4f30-b81a-00dd11a28378	PATCH /api/stock/products/d24067c1-44bb-4f30-b81a-00dd11a28378	PATCH	/api/stock/products/d24067c1-44bb-4f30-b81a-00dd11a28378	2026-06-01 22:29:13.991
91c3869b-5924-41f8-ac6c-64b632d6bfb9	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	patch.stock.products.d24067c1-44bb-4f30-b81a-00dd11a28378	PATCH /api/stock/products/d24067c1-44bb-4f30-b81a-00dd11a28378	PATCH	/api/stock/products/d24067c1-44bb-4f30-b81a-00dd11a28378	2026-06-01 22:30:15.384
72d34bf4-2383-4e8e-9b1b-9b1dcea41ff8	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	patch.stock.productions.9bc9a4e0-5c2f-45b6-b72b-4cf567f3b5bc	Modification d'une production	PATCH	/api/stock/productions/9bc9a4e0-5c2f-45b6-b72b-4cf567f3b5bc	2026-06-02 10:11:45.198
c36b8738-b8fc-40db-87c2-1ae6d1b35579	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	post.sales	Enregistrement d'une vente ou d'un devis	POST	/api/sales	2026-06-02 10:13:42.78
5dec12d0-56ff-408f-83e6-6ea6523be403	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	patch.sales.2c656a32-5233-4fd6-9080-d077d7e939a3.payment-status	Mise à jour du paiement d'une vente	PATCH	/api/sales/2c656a32-5233-4fd6-9080-d077d7e939a3/payment-status	2026-06-02 10:13:48.909
374ca71d-06ee-4937-a0a6-066ce885a87c	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.deliveries	Enregistrement d'une course	POST	/api/deliveries	2026-06-02 16:39:34.573
50956569-5648-490f-9a7e-e4d971717dfd	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.stock.productions	Enregistrement d'une production	POST	/api/stock/productions	2026-06-02 16:41:31.477
882d6213-93a7-41a5-8da7-a6da85b93179	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.stock.productions	Enregistrement d'une production	POST	/api/stock/productions	2026-06-02 16:42:01.92
107cd8c0-074a-4dae-aaa9-a7602de87df8	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.stock.productions	Enregistrement d'une production	POST	/api/stock/productions	2026-06-02 16:43:44.094
febdc26e-f08c-4c80-851c-e98073e5eff4	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.stock.productions	Enregistrement d'une production	POST	/api/stock/productions	2026-06-02 16:44:26.274
88535cd8-c7d5-4e19-b9b1-2cfb7aa2bbca	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.stock.productions	Enregistrement d'une production	POST	/api/stock/productions	2026-06-02 16:45:20.7
82423bfb-15e4-429b-93dc-95efa4200792	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.stock.productions	Enregistrement d'une production	POST	/api/stock/productions	2026-06-02 16:45:40.946
c442805c-427d-45e3-a11f-c02de66daa40	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.stock.productions	Enregistrement d'une production	POST	/api/stock/productions	2026-06-02 16:46:05.183
e2dee015-1c33-4cbb-bb3b-e3bba5630f6d	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.stock.productions	Enregistrement d'une production	POST	/api/stock/productions	2026-06-02 16:46:53.026
d0583bd7-c326-4219-b966-c34e6d037d48	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.e4218f54-dd55-4360-89d6-2247ca598444	Modification d'une course	PATCH	/api/deliveries/e4218f54-dd55-4360-89d6-2247ca598444	2026-06-02 18:37:03.971
a0c3c5ec-00a3-4af5-ae8a-8f613f0d8c50	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.e4218f54-dd55-4360-89d6-2247ca598444.remaining	Mise à jour des restants d'une course	PATCH	/api/deliveries/e4218f54-dd55-4360-89d6-2247ca598444/remaining	2026-06-02 18:37:32.674
6e672ddf-9b7c-479e-b893-6269273e55cd	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.e4218f54-dd55-4360-89d6-2247ca598444.remaining	Mise à jour des restants d'une course	PATCH	/api/deliveries/e4218f54-dd55-4360-89d6-2247ca598444/remaining	2026-06-02 18:37:56.972
353499c0-f514-4ce5-8243-bd20947dbd1b	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.bf5678de-a268-4ef7-b42c-4ff7578276ea	Modification d'une course	PATCH	/api/deliveries/bf5678de-a268-4ef7-b42c-4ff7578276ea	2026-06-02 18:38:33.717
80e174ac-6fc4-4f32-9c2b-40f02a94f921	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.e4218f54-dd55-4360-89d6-2247ca598444.remaining	Mise à jour des restants d'une course	PATCH	/api/deliveries/e4218f54-dd55-4360-89d6-2247ca598444/remaining	2026-06-02 18:38:51.172
559d75a5-c846-4222-8973-c5497c010552	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.e4218f54-dd55-4360-89d6-2247ca598444.remaining	Mise à jour des restants d'une course	PATCH	/api/deliveries/e4218f54-dd55-4360-89d6-2247ca598444/remaining	2026-06-02 18:39:41.769
56bef305-f261-4289-8782-11d979972509	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.bf5678de-a268-4ef7-b42c-4ff7578276ea.remaining	Mise à jour des restants d'une course	PATCH	/api/deliveries/bf5678de-a268-4ef7-b42c-4ff7578276ea/remaining	2026-06-02 18:40:08.272
2afd71d1-42fe-4d69-b351-9a560b5cfce8	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.e4218f54-dd55-4360-89d6-2247ca598444.remaining	Mise à jour des restants d'une course	PATCH	/api/deliveries/e4218f54-dd55-4360-89d6-2247ca598444/remaining	2026-06-02 18:40:30.44
15730eb9-2b71-4c49-a889-f526f700189e	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.e4218f54-dd55-4360-89d6-2247ca598444.remaining	Mise à jour des restants d'une course	PATCH	/api/deliveries/e4218f54-dd55-4360-89d6-2247ca598444/remaining	2026-06-02 18:40:48.988
f787ada8-5b27-48ae-a3e8-1d40876a17df	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.e4218f54-dd55-4360-89d6-2247ca598444.remaining	Mise à jour des restants d'une course	PATCH	/api/deliveries/e4218f54-dd55-4360-89d6-2247ca598444/remaining	2026-06-02 18:40:59.158
b5af55e5-a3a0-464c-aff3-ac4765465254	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.e4218f54-dd55-4360-89d6-2247ca598444	Modification d'une course	PATCH	/api/deliveries/e4218f54-dd55-4360-89d6-2247ca598444	2026-06-02 18:43:24.479
86bf092a-91b2-4d55-8aac-30c9f8088b0a	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.sales.19ba709c-fe03-42dd-9743-441155b4671e	Modification d'une vente	PATCH	/api/sales/19ba709c-fe03-42dd-9743-441155b4671e	2026-06-02 18:44:10.575
06298e13-3c28-4c5b-9ea9-782267e5e05f	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.sales.582044fb-efb9-4269-b7d0-07b934006526	Modification d'une vente	PATCH	/api/sales/582044fb-efb9-4269-b7d0-07b934006526	2026-06-02 18:44:52.07
7ffb3cbd-ebff-4bfa-bdae-325aa991ea0b	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.accounting.balances	Mise à jour des soldes par canal	PATCH	/api/accounting/balances	2026-06-03 09:51:28.151
14117eb2-2eff-427b-8f78-e71054622388	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.stock.productions.44a4631d-5a8b-4939-ba5a-0a7afe317a8e	Modification d'une production	PATCH	/api/stock/productions/44a4631d-5a8b-4939-ba5a-0a7afe317a8e	2026-06-03 09:53:25.944
20d89613-9448-4402-ae9f-c076956f03d6	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.sales.8184a0c8-9596-4d76-b5b5-565caa911c8f.convert-to-sale	Conversion d'un devis en vente	POST	/api/sales/8184a0c8-9596-4d76-b5b5-565caa911c8f/convert-to-sale	2026-06-03 09:53:49.958
26ac122c-56ab-40e9-b56f-552069f06b57	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.sales.8184a0c8-9596-4d76-b5b5-565caa911c8f.payment-status	Mise à jour du paiement d'une vente	PATCH	/api/sales/8184a0c8-9596-4d76-b5b5-565caa911c8f/payment-status	2026-06-03 09:54:02.451
c6a12270-378f-48b9-89fc-74d5d0e12e1f	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.accounting.balances	Mise à jour des soldes par canal	PATCH	/api/accounting/balances	2026-06-03 09:54:30.336
477eba63-9253-49d2-b031-c18abadf4c78	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.sales	Enregistrement d'une vente ou d'un devis	POST	/api/sales	2026-06-03 11:41:48.731
aac26128-23e7-4ed7-8b74-a5e2a342bee0	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.sales.c762044a-3df5-493b-b7bb-873ff8222a33.payment-status	Mise à jour du paiement d'une vente	PATCH	/api/sales/c762044a-3df5-493b-b7bb-873ff8222a33/payment-status	2026-06-03 11:41:52.479
8a9d9fa1-233b-4cf3-8156-8831df0fbe02	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.sales	Enregistrement d'une vente ou d'un devis	POST	/api/sales	2026-06-03 11:45:11.369
71c9bbfb-a645-4b32-97be-6d5f6df68771	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.sales.7efc7465-d49f-4f6c-add8-211ecd1446b6.payment-status	Mise à jour du paiement d'une vente	PATCH	/api/sales/7efc7465-d49f-4f6c-add8-211ecd1446b6/payment-status	2026-06-03 11:45:14.126
496dff7c-651b-4e4b-a5e4-afc24a9c9676	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.e4218f54-dd55-4360-89d6-2247ca598444	Modification d'une course	PATCH	/api/deliveries/e4218f54-dd55-4360-89d6-2247ca598444	2026-06-03 12:43:30.313
ff6515dd-dd6b-4469-a518-f6d20b10bc28	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	patch.deliveries.e4218f54-dd55-4360-89d6-2247ca598444	Modification d'une course	PATCH	/api/deliveries/e4218f54-dd55-4360-89d6-2247ca598444	2026-06-03 14:28:58.538
991634cb-4cba-4649-a075-d1b121127e6b	e8ecad92-31ef-43dc-986b-033329feb99d	Mami Dieye	mami@yowell.com	post.sales	Enregistrement d'une vente ou d'un devis	POST	/api/sales	2026-06-04 13:21:34.878
1ef623cf-44c1-4392-b807-8f1761594f27	e8ecad92-31ef-43dc-986b-033329feb99d	Mami Dieye	mami@yowell.com	post.sales	Enregistrement d'une vente ou d'un devis	POST	/api/sales	2026-06-04 13:22:19.88
049ee0ee-cb4b-460c-ba95-5cd22c1b330a	e8ecad92-31ef-43dc-986b-033329feb99d	Mami Dieye	mami@yowell.com	patch.sales.c5e08898-a581-4e62-ac1e-aefdef32e729	Modification d'une vente	PATCH	/api/sales/c5e08898-a581-4e62-ac1e-aefdef32e729	2026-06-04 13:22:56.989
80aea592-2ae0-44d4-8af8-73ecf68aebc6	e8ecad92-31ef-43dc-986b-033329feb99d	Mami Dieye	mami@yowell.com	get.sales.c5e08898-a581-4e62-ac1e-aefdef32e729.invoice	Téléchargement d'une facture ou d'un devis	GET	/api/sales/c5e08898-a581-4e62-ac1e-aefdef32e729/invoice	2026-06-04 13:23:20.084
060ef6c9-ffcc-47b5-b401-77a94ccab044	e8ecad92-31ef-43dc-986b-033329feb99d	Mami Dieye	mami@yowell.com	post.sales	Enregistrement d'une vente ou d'un devis	POST	/api/sales	2026-06-04 13:52:16.41
9bc72fc9-b8bf-4c91-8f6d-6676f5d4fa05	e8ecad92-31ef-43dc-986b-033329feb99d	Mami Dieye	mami@yowell.com	delete.sales.c5e08898-a581-4e62-ac1e-aefdef32e729	Suppression d'une vente ou d'un devis	DELETE	/api/sales/c5e08898-a581-4e62-ac1e-aefdef32e729	2026-06-04 14:25:36.973
29c46c94-a9b0-44d1-b60c-baa13cba4037	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	post.sales	Enregistrement d'une vente ou d'un devis	POST	/api/sales	2026-06-04 21:13:48.676
73ab0eea-543c-46c4-96fa-07c7cfefc3cd	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	patch.sales.c2224c8f-833e-473e-be66-9dd1265f7951	Modification d'une vente	PATCH	/api/sales/c2224c8f-833e-473e-be66-9dd1265f7951	2026-06-05 11:03:53.646
2ac27fdf-d16c-4032-84bd-1744ec4bc48e	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	patch.sales.c2224c8f-833e-473e-be66-9dd1265f7951.payment-status	Mise à jour du paiement d'une vente	PATCH	/api/sales/c2224c8f-833e-473e-be66-9dd1265f7951/payment-status	2026-06-05 11:08:50.606
832a56c3-f178-4aeb-8b5e-f67106bda2f3	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	patch.sales.c2224c8f-833e-473e-be66-9dd1265f7951	Modification d'une vente	PATCH	/api/sales/c2224c8f-833e-473e-be66-9dd1265f7951	2026-06-05 11:09:39.073
a2e3ffd3-9481-4bfd-affe-e7460b6f251a	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	post.sales	Enregistrement d'une vente ou d'un devis	POST	/api/sales	2026-06-05 14:22:11.769
61bf14d2-c3c4-414e-8d94-675d56b1b790	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	patch.sales.b3936aa3-c770-4254-8ded-a6294023d04e.payment-status	Mise à jour du paiement d'une vente	PATCH	/api/sales/b3936aa3-c770-4254-8ded-a6294023d04e/payment-status	2026-06-05 14:22:19.249
e27d0d65-626a-42cc-bde6-594275e9dfd3	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	patch.sales.b3936aa3-c770-4254-8ded-a6294023d04e	Modification d'une vente	PATCH	/api/sales/b3936aa3-c770-4254-8ded-a6294023d04e	2026-06-05 14:22:41.777
1de65166-5aa0-485a-8c4d-12c4f2005a99	ce67fca4-7cb6-4c6f-b433-1da93a108a98	Fatimata Sy	fatima@yowell.com	patch.sales.b3936aa3-c770-4254-8ded-a6294023d04e	Modification d'une vente	PATCH	/api/sales/b3936aa3-c770-4254-8ded-a6294023d04e	2026-06-05 14:23:16.371
5f02d0e2-aa58-4709-8125-7514276c5bfd	2f167967-15f5-4dd8-978c-4be44a7f1de0	amina sow	amina@yowell.com	post.accounting.entries	Saisie comptable manuelle	POST	/api/accounting/entries	2026-06-05 21:23:04.256
\.


--
-- Data for Name: Client; Type: TABLE DATA; Schema: public; Owner: yowell_db_user
--

COPY public."Client" (id, name, phone, email, address, notes, "createdAt", "updatedAt") FROM stdin;
24270523-d8d2-4791-8ef9-d662fa0e13a7	Ndeye Awa Diame	77 702 13 06		Ouakam cité batrain		2026-05-27 13:45:01.342	2026-05-27 13:45:01.342
33d34ab2-a021-4c98-933a-f3bf38671b5e	Mohamed Charara	77 719 03 30		Alamadies		2026-05-27 13:46:09.333	2026-05-27 13:46:09.333
07717e29-e87c-46f1-9db3-f1bd529222d7	Ramatoulaye TALL	77 617 55 34		Liberté 6		2026-05-27 13:47:54.116	2026-05-27 13:47:54.116
d696e870-3b87-441c-9697-e8d592a6ed82	Yaye Faty Tall	77 649 11 69		Sicap Foire		2026-05-27 13:48:39.497	2026-05-27 13:48:39.497
be7b7c35-2375-466e-9293-3686b8377889	Mominatou	77 713 19 11		Ouest Foire		2026-05-27 13:49:28.094	2026-05-27 13:49:28.094
8a9d6ea7-86b8-4dc9-aff3-1b346c99ba89	Ramata B. A. Dieye	77 870 33 57		Mermoz		2026-05-27 13:50:46.576	2026-05-27 13:50:46.576
882c219d-5b8f-4b6c-8ae7-2f3926bb3f1b	Dieynaba Tall	77 650 94 17		Sacré Coeur 2		2026-05-27 13:51:45.359	2026-05-27 13:51:45.359
8f60e2eb-227b-4da4-8b42-264232794abd	Tékhé Dieye	77 853 92 92 - 77 638 35 54		Cité keur gorgui	Adore le Madd passion	2026-05-28 07:39:31.714	2026-05-28 07:39:31.714
2e5e8954-68aa-46bf-8f43-d542d16461c6	Aicha Gamby	774416673		Cite keur Damel		2026-05-30 14:35:39.148	2026-05-30 14:35:39.148
578c6066-577a-4a44-98b7-12244227cb23	Ramata B. A. Dieye			Montpellier		2026-05-31 23:34:35.15	2026-05-31 23:34:35.15
a0f2659f-f7f7-4d74-a830-0183c298a868	Djena Kouyaté					2026-06-04 13:19:57.345	2026-06-04 13:19:57.345
4fcf8833-e24c-46e5-961e-9af3ff7c8b6c	Mapote Wade	77 453 84 03			En général vient récuperer ses commandes lui meme	2026-06-04 21:12:48.843	2026-06-04 21:12:48.843
\.


--
-- Data for Name: DeliveryRun; Type: TABLE DATA; Schema: public; Owner: yowell_db_user
--

COPY public."DeliveryRun" (id, date, "totalAmount", "createdAt", "updatedAt", "paymentChannel") FROM stdin;
b6477db0-a219-4b64-863c-bd225d6f6205	2026-05-20 00:00:00	24350	2026-05-27 12:27:31.164	2026-06-01 14:56:03.974	WAVE
bf5678de-a268-4ef7-b42c-4ff7578276ea	2026-05-25 00:00:00	37000	2026-05-27 12:47:00.968	2026-06-02 18:38:33.706	CASH
e4218f54-dd55-4360-89d6-2247ca598444	2026-06-02 00:00:00	85335	2026-06-02 16:39:34.372	2026-06-03 14:28:58.241	WAVE
\.


--
-- Data for Name: DeliveryRunFee; Type: TABLE DATA; Schema: public; Owner: yowell_db_user
--

COPY public."DeliveryRunFee" (id, "runId", label, amount, "createdAt", "updatedAt") FROM stdin;
78db091c-67f8-4155-a951-ddaca5b65e78	b6477db0-a219-4b64-863c-bd225d6f6205	Transport	1100	2026-06-01 14:56:04.073	2026-06-01 14:56:04.073
b31ee220-af1f-4f06-b84e-61a2439c8512	b6477db0-a219-4b64-863c-bd225d6f6205	Livraison	2500	2026-06-01 14:56:04.073	2026-06-01 14:56:04.073
d5feab97-be4b-404b-adb9-ede249be7ae3	bf5678de-a268-4ef7-b42c-4ff7578276ea	Livraison Bouteilles	1500	2026-06-02 18:38:33.711	2026-06-02 18:38:33.711
397cdf2a-95e3-4560-97ca-eda80d5e4534	bf5678de-a268-4ef7-b42c-4ff7578276ea	Livraison Maad	2500	2026-06-02 18:38:33.711	2026-06-02 18:38:33.711
21d46a0a-dac5-4d03-99cb-1867b9d8a2e5	e4218f54-dd55-4360-89d6-2247ca598444	frais wave	835	2026-06-03 14:28:58.436	2026-06-03 14:28:58.436
a0d30004-938d-4d29-bf09-cffdf39a6ea4	e4218f54-dd55-4360-89d6-2247ca598444	Transport	9000	2026-06-03 14:28:58.436	2026-06-03 14:28:58.436
c51b7cb6-aa12-4f5a-ad9e-534024429553	e4218f54-dd55-4360-89d6-2247ca598444	Etiquettes	11500	2026-06-03 14:28:58.436	2026-06-03 14:28:58.436
84c6f261-94dd-4bb8-bd20-cc3faf11491f	e4218f54-dd55-4360-89d6-2247ca598444	Livraison des etiquettes	2500	2026-06-03 14:28:58.436	2026-06-03 14:28:58.436
\.


--
-- Data for Name: DeliveryRunItem; Type: TABLE DATA; Schema: public; Owner: yowell_db_user
--

COPY public."DeliveryRunItem" (id, "runId", label, quantity, "unitPrice", "lineTotal", "hasRemaining", "remainingNote", "createdAt", "updatedAt", "initialRemainingStock") FROM stdin;
aac3abdb-f2d5-46f7-b1be-b46c69f45dbf	b6477db0-a219-4b64-863c-bd225d6f6205	Bouye (kg)	1	1200	1200	\N	\N	2026-06-01 14:56:03.982	2026-06-01 14:56:03.982	\N
399e6c3c-9f02-43b3-936e-ef699cfaf4ad	b6477db0-a219-4b64-863c-bd225d6f6205	Eldorado (unite)	3	350	1050	\N	\N	2026-06-01 14:56:03.982	2026-06-01 14:56:03.982	\N
eb4dec3d-fb1e-4df0-8984-bb1e9c84db87	b6477db0-a219-4b64-863c-bd225d6f6205	Maad (kg)	4	2500	10000	\N	\N	2026-06-01 14:56:03.982	2026-06-01 14:56:03.982	\N
04e2d76c-0da3-42de-ae72-86d6fbd762fd	b6477db0-a219-4b64-863c-bd225d6f6205	Passion (kg)	1	4000	4000	\N	\N	2026-06-01 14:56:03.982	2026-06-01 14:56:03.982	\N
5e6244fb-8f99-451a-a5fa-e1c6c2725764	b6477db0-a219-4b64-863c-bd225d6f6205	Mangue (kg)	0.5	1000	500	\N	\N	2026-06-01 14:56:03.982	2026-06-01 14:56:03.982	\N
052db1f0-978d-4fa0-9a54-6718a1fd1659	b6477db0-a219-4b64-863c-bd225d6f6205	Sucre 5kg	1	4000	4000	\N	\N	2026-06-01 14:56:03.982	2026-06-01 14:56:03.982	\N
aa3954f7-c0a0-43ca-89f4-ee93211131dc	e4218f54-dd55-4360-89d6-2247ca598444	Essence Menthe	1	300	300	\N	\N	2026-06-03 14:28:58.338	2026-06-03 14:28:58.338	\N
4ff6b3b1-5423-488f-861d-92b5e17d02e5	e4218f54-dd55-4360-89d6-2247ca598444	Sucre 5 kg	1	4000	4000	\N	\N	2026-06-03 14:28:58.338	2026-06-03 14:28:58.338	\N
2b5dd605-4a05-4328-bfc6-5ce8b57e715d	e4218f54-dd55-4360-89d6-2247ca598444	Mangue	7	1000	7000	\N	\N	2026-06-03 14:28:58.338	2026-06-03 14:28:58.338	\N
16c0e6b2-2b04-49b6-9262-8613f0843843	e4218f54-dd55-4360-89d6-2247ca598444	Menthe	1	250	250	\N	\N	2026-06-03 14:28:58.338	2026-06-03 14:28:58.338	\N
1eb96c69-76fa-472a-b29a-5612b8bc0612	e4218f54-dd55-4360-89d6-2247ca598444	Bissap (pot)	1	1000	1000	\N	\N	2026-06-03 14:28:58.338	2026-06-03 14:28:58.338	\N
df039de2-96d8-4219-b200-66e18844415b	bf5678de-a268-4ef7-b42c-4ff7578276ea	Maad	8	2500	20000	\N	\N	2026-06-02 18:38:33.709	2026-06-02 18:38:33.709	\N
6a895f51-337a-4568-849d-4662a17e3832	bf5678de-a268-4ef7-b42c-4ff7578276ea	Passion	2	3000	6000	\N	\N	2026-06-02 18:38:33.709	2026-06-02 18:38:33.709	\N
d2c7708f-d276-4c49-b5bd-963c9549c427	bf5678de-a268-4ef7-b42c-4ff7578276ea	Mangue	2	1000	2000	\N	\N	2026-06-02 18:38:33.709	2026-06-02 18:38:33.709	\N
80424c6c-75c8-48e4-ac1f-212c855f19ad	e4218f54-dd55-4360-89d6-2247ca598444	Bouye	1	1200	1200	\N	\N	2026-06-03 14:28:58.338	2026-06-03 14:28:58.338	\N
a42679a9-b77f-456f-b1c1-145297c62353	bf5678de-a268-4ef7-b42c-4ff7578276ea	Bouteilles 1L	50	100	5000	t	9	2026-06-02 18:38:33.709	2026-06-02 18:40:08.23	50
273c43f5-269b-42f7-8d48-de4b0595debe	e4218f54-dd55-4360-89d6-2247ca598444	Lait de coco	1	1200	1200	\N	\N	2026-06-03 14:28:58.338	2026-06-03 14:28:58.338	\N
5f9cd28e-abb6-40d4-850c-9bbb178aec06	e4218f54-dd55-4360-89d6-2247ca598444	Bouteilles 250 ml	50	60	3000	\N	\N	2026-06-03 14:28:58.338	2026-06-03 14:28:58.338	\N
5fa63296-2b70-406c-9a1d-9bcd8a82d9b7	e4218f54-dd55-4360-89d6-2247ca598444	Maad	10	2500	25000	\N	\N	2026-06-03 14:28:58.338	2026-06-03 14:28:58.338	\N
710b1e36-1905-490b-8603-b7c30c412d65	e4218f54-dd55-4360-89d6-2247ca598444	Passion	2.5	4000	10000	\N	\N	2026-06-03 14:28:58.338	2026-06-03 14:28:58.338	\N
07e778d7-9c02-44b3-b8b4-852731d0997c	e4218f54-dd55-4360-89d6-2247ca598444	Essence vanille	10	325	3250	\N	\N	2026-06-03 14:28:58.338	2026-06-03 14:28:58.338	\N
ac47bf9c-b8bb-4581-8f83-30323e3f7687	e4218f54-dd55-4360-89d6-2247ca598444	Fleur d'oranger	6	300	1800	\N	\N	2026-06-03 14:28:58.338	2026-06-03 14:28:58.338	\N
89e957aa-215a-409c-b05e-ebd86c1df1b1	e4218f54-dd55-4360-89d6-2247ca598444	Eldorado	10	350	3500	\N	\N	2026-06-03 14:28:58.338	2026-06-03 14:28:58.338	\N
\.


--
-- Data for Name: ManualAccountingEntry; Type: TABLE DATA; Schema: public; Owner: yowell_db_user
--

COPY public."ManualAccountingEntry" (id, date, label, amount, type, "createdAt") FROM stdin;
2960c791-4857-4c5e-ad0b-519208a6cf63	2026-06-05 00:00:00	Livraison pou la commande de Djena	808	EXPENSE	2026-06-05 21:23:04.251
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: yowell_db_user
--

COPY public."Product" (id, name, description, "createdAt", "updatedAt") FROM stdin;
672c56e3-b3da-482b-8f39-382a5170379d	Bouye	Bouye, lait,	2026-05-27 10:53:52.951	2026-05-27 10:53:52.951
9eb60fab-f6f8-4414-8ba6-971dfc587b4e	Bouye corossol	Bouye lait corossol	2026-05-27 11:03:41.135	2026-05-27 11:03:41.135
799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	maad fruit de la passion mangue	2026-05-27 11:07:45.575	2026-05-27 11:07:45.575
93a3502a-a2aa-4812-a80b-215a0244053e	Mangue lait	Mangue lait de coco	2026-05-27 11:09:44.142	2026-05-27 11:09:44.142
39b16a2d-8ace-4adf-b328-448d7f9f79fd	Mangue citron	mangue citron	2026-05-27 11:12:41.328	2026-05-27 11:12:41.328
a2f9b2ad-bb7c-4447-b7e7-af59a4d755e0	Pina colada	Ananas lait de coco	2026-05-27 11:16:11.095	2026-05-27 11:16:11.095
e243b988-9850-4267-9f07-0974486cd052	golden twist	mandarine Ananas	2026-05-27 11:18:06.041	2026-05-27 11:18:06.041
e0bbbc7f-fd88-4323-bc3f-08ef988bc9c1	gingembre	gingembre ananas	2026-05-27 11:20:29.048	2026-05-27 11:20:29.048
ade0c6cc-ce16-446a-be66-998adfc74378	Ditakh	Ditakh	2026-05-27 11:23:43.891	2026-05-27 11:23:43.891
079e5c5d-6f81-43c7-a43a-50d0e7204351	Tamarin	tamarin	2026-05-27 11:25:27.692	2026-05-27 11:25:27.692
2a750ee9-aee0-42f8-bab4-4dbafc5cef56	kiwana	Kiwi ananas gingembre	2026-05-27 11:26:56.307	2026-05-27 11:26:56.307
ffb3c728-13ce-4356-ae7f-111aa1f7dd03	Bouye goyave	bouye lait goyave	2026-05-27 11:31:36.737	2026-05-27 11:31:36.737
5158779c-6f7e-4fe6-9eec-096c66ccd2ea	Bissap blanc	bissap ananas	2026-05-27 11:32:54.036	2026-05-27 11:32:54.036
724385a8-40aa-4095-a2b2-13331c274878	Prune	prune mandarine citron	2026-05-27 11:36:01.773	2026-05-27 11:36:01.773
664a2ff3-af70-4960-82bb-33a0df356d01	Bouye berry	Bouye fraise	2026-05-27 11:37:29.484	2026-05-27 11:37:29.484
92560b4b-ed23-49eb-8779-e8b00c00c376	Isla paradiso	Orange mangue raisin ananas	2026-05-27 11:40:27.418	2026-05-27 11:40:27.418
06b61adb-2e71-463d-85eb-50a33952cfe6	agrumes peps	Orange mandarine citron	2026-05-27 11:41:58.475	2026-05-27 11:41:58.475
7fbfd51f-2cd3-40af-9ffa-d3fa8452ba54	Bissap Rouge	Bissap, Mentre	2026-05-27 13:59:39.671	2026-05-27 13:59:39.671
d24067c1-44bb-4f30-b81a-00dd11a28378	Orange carotte	orange carotte	2026-05-27 11:14:22.765	2026-06-01 22:30:15.375
\.


--
-- Data for Name: ProductFormat; Type: TABLE DATA; Schema: public; Owner: yowell_db_user
--

COPY public."ProductFormat" (id, "productId", volume, price, quantity, "minQuantity", enabled, "createdAt", "updatedAt") FROM stdin;
4fc2c19a-ed16-4763-bcd8-73d83f69ceb9	9eb60fab-f6f8-4414-8ba6-971dfc587b4e	1L	2500	0	5	t	2026-05-27 11:03:41.135	2026-05-27 11:03:41.135
2e46acfa-9aa7-4442-b113-0547cb898fe9	9eb60fab-f6f8-4414-8ba6-971dfc587b4e	250ml	650	0	5	t	2026-05-27 11:03:41.135	2026-05-27 11:03:41.135
370e9a72-5779-4c07-83ec-0606c5fd3bdf	39b16a2d-8ace-4adf-b328-448d7f9f79fd	1L	3000	0	5	t	2026-05-27 11:12:41.328	2026-05-27 11:12:41.328
d21e1ebd-0df4-4022-98a4-1897a6707e21	39b16a2d-8ace-4adf-b328-448d7f9f79fd	250ml	750	0	5	t	2026-05-27 11:12:41.328	2026-05-27 11:12:41.328
df4b08b8-a654-47f4-9892-e37de4c126d7	a2f9b2ad-bb7c-4447-b7e7-af59a4d755e0	1L	2500	0	5	t	2026-05-27 11:16:11.095	2026-05-27 11:16:11.095
d56119f5-25dd-49ae-a636-f144f1c15645	e243b988-9850-4267-9f07-0974486cd052	1L	2500	0	5	t	2026-05-27 11:18:06.041	2026-05-27 11:18:06.041
fb2bf7e7-0d0d-428c-87f9-13fab81e985c	e243b988-9850-4267-9f07-0974486cd052	250ml	650	0	5	t	2026-05-27 11:18:06.041	2026-05-27 11:18:06.041
9846b0af-aadc-4d1b-b3e5-3230716617a8	e0bbbc7f-fd88-4323-bc3f-08ef988bc9c1	1L	2500	0	5	t	2026-05-27 11:20:29.048	2026-05-27 11:20:29.048
9735ee64-7bb6-478a-9e0b-dca076320fd8	e0bbbc7f-fd88-4323-bc3f-08ef988bc9c1	250ml	650	0	5	t	2026-05-27 11:20:29.048	2026-05-27 11:20:29.048
d60ef4a2-b005-48d3-89f9-1651f3206e23	ade0c6cc-ce16-446a-be66-998adfc74378	1L	2500	0	5	t	2026-05-27 11:23:43.891	2026-05-27 11:23:43.891
a13738f6-d9b7-4fbb-b0d2-5f537d3d423b	ade0c6cc-ce16-446a-be66-998adfc74378	250ml	650	0	5	t	2026-05-27 11:23:43.891	2026-05-27 11:23:43.891
2942787f-89cc-4c1b-b01f-623156f8dc65	079e5c5d-6f81-43c7-a43a-50d0e7204351	1L	2000	0	5	t	2026-05-27 11:25:27.692	2026-05-27 11:25:27.692
cdfc8259-d599-4e3b-a83e-011c75fefa24	079e5c5d-6f81-43c7-a43a-50d0e7204351	250ml	500	0	5	t	2026-05-27 11:25:27.692	2026-05-27 11:25:27.692
940588ca-73d7-470c-b920-dcd9b3f37e03	2a750ee9-aee0-42f8-bab4-4dbafc5cef56	1L	3000	0	5	t	2026-05-27 11:26:56.307	2026-05-27 11:26:56.307
cc0014e9-6d7d-42bd-b06e-5b89f230a105	2a750ee9-aee0-42f8-bab4-4dbafc5cef56	250ml	750	0	5	t	2026-05-27 11:26:56.307	2026-05-27 11:26:56.307
6007b4ae-beed-4587-b355-e0ab1abe4ab5	ffb3c728-13ce-4356-ae7f-111aa1f7dd03	1L	3000	0	5	t	2026-05-27 11:31:36.737	2026-05-27 11:31:36.737
d3a77b2e-69e3-4f0c-b7b9-dbdf38bb5754	ffb3c728-13ce-4356-ae7f-111aa1f7dd03	250ml	750	0	5	t	2026-05-27 11:31:36.737	2026-05-27 11:31:36.737
36739447-fda5-48e1-a05a-3bdf80674ec9	5158779c-6f7e-4fe6-9eec-096c66ccd2ea	1L	2500	0	5	t	2026-05-27 11:32:54.036	2026-05-27 11:32:54.036
8c238883-aef1-414f-b13f-adb5e015410c	5158779c-6f7e-4fe6-9eec-096c66ccd2ea	250ml	650	0	5	t	2026-05-27 11:32:54.036	2026-05-27 11:32:54.036
5d061aa9-e749-48d6-9112-04c28f2c1e2c	724385a8-40aa-4095-a2b2-13331c274878	1L	3000	0	5	t	2026-05-27 11:36:01.773	2026-05-27 11:36:01.773
db6b3d22-e148-4f78-9d5a-5a91c9b5ef5f	724385a8-40aa-4095-a2b2-13331c274878	250ml	750	0	5	t	2026-05-27 11:36:01.773	2026-05-27 11:36:01.773
48d21ca7-b880-4029-9b15-a7e55233d697	664a2ff3-af70-4960-82bb-33a0df356d01	1L	3000	0	5	t	2026-05-27 11:37:29.484	2026-05-27 11:37:29.484
2653c8fc-4f9f-431a-87a9-9f21ad7ec35f	664a2ff3-af70-4960-82bb-33a0df356d01	250ml	750	0	5	t	2026-05-27 11:37:29.484	2026-05-27 11:37:29.484
84e23cc8-79cd-477f-a991-9884664be6c8	92560b4b-ed23-49eb-8779-e8b00c00c376	1L	3000	0	5	t	2026-05-27 11:40:27.418	2026-05-27 11:40:27.418
055f2ec9-0c2a-4f9a-ac36-edcfe39e7714	92560b4b-ed23-49eb-8779-e8b00c00c376	250ml	750	0	5	t	2026-05-27 11:40:27.418	2026-05-27 11:40:27.418
a7f9db3e-d165-4f50-85c3-206bf683ef61	06b61adb-2e71-463d-85eb-50a33952cfe6	1L	3000	0	5	t	2026-05-27 11:41:58.475	2026-05-27 11:41:58.475
1abeed6e-603c-4bc7-9449-4356552bb82f	06b61adb-2e71-463d-85eb-50a33952cfe6	250ml	750	0	5	t	2026-05-27 11:41:58.475	2026-05-27 11:41:58.475
6b99c380-f011-4070-9441-b07b37a6daa2	7fbfd51f-2cd3-40af-9ffa-d3fa8452ba54	250ml	500	0	2	t	2026-05-27 13:59:39.671	2026-06-03 11:45:11.288
735f6bce-ff05-471e-9a43-c4cacdb697ca	a2f9b2ad-bb7c-4447-b7e7-af59a4d755e0	250ml	650	0	5	t	2026-05-27 11:16:11.095	2026-06-03 11:45:11.29
7b342eab-e06f-4721-9b08-ad938566cfbc	7fbfd51f-2cd3-40af-9ffa-d3fa8452ba54	1L	2000	6	5	t	2026-05-27 13:59:39.671	2026-06-02 18:44:51.968
18a77c25-1cd7-4227-a370-8af06dae24a6	93a3502a-a2aa-4812-a80b-215a0244053e	1L	3000	0	5	t	2026-05-27 11:09:44.142	2026-06-05 14:23:16.318
91b43d2d-59ee-45ee-960d-8df0d1b49e0d	d24067c1-44bb-4f30-b81a-00dd11a28378	250ml	650	0	6	t	2026-05-27 11:14:22.765	2026-06-03 11:45:11.291
e40fd1ca-77f9-43ce-9088-181e9ea31325	93a3502a-a2aa-4812-a80b-215a0244053e	250ml	750	0	5	t	2026-05-27 11:09:44.142	2026-06-03 11:45:11.292
d2e5a515-31f1-41ca-9098-f646b47de26d	799dd480-bc01-4887-a389-f81f5cadb5b7	250ml	750	0	5	t	2026-05-27 11:07:45.575	2026-06-03 11:45:11.293
44ee023a-3c09-4d13-9e2e-7b8f5ce24f5c	799dd480-bc01-4887-a389-f81f5cadb5b7	1L	3000	8	5	t	2026-05-27 11:07:45.575	2026-06-05 14:23:16.319
b1f03aaa-6d86-4ced-ac73-2dbbfa0fb152	672c56e3-b3da-482b-8f39-382a5170379d	1L	2000	5	5	t	2026-05-27 10:53:52.951	2026-06-02 18:44:51.97
1a1a2184-60c8-4e9d-8533-efd2d68c7f8b	d24067c1-44bb-4f30-b81a-00dd11a28378	1L	2500	0	5	t	2026-05-27 11:14:22.765	2026-06-01 22:30:15.377
3c571fed-3130-4cd3-b39f-18400424b19f	672c56e3-b3da-482b-8f39-382a5170379d	250ml	500	0	5	t	2026-05-27 10:53:52.951	2026-06-03 09:53:49.951
\.


--
-- Data for Name: ProductPhoto; Type: TABLE DATA; Schema: public; Owner: yowell_db_user
--

COPY public."ProductPhoto" (id, "productId", url, "position", "createdAt") FROM stdin;
\.


--
-- Data for Name: ProductionRecord; Type: TABLE DATA; Schema: public; Owner: yowell_db_user
--

COPY public."ProductionRecord" (id, "productId", "productName", volume, quantity, "producedAt", notes, "createdAt") FROM stdin;
a3da706c-3391-42ad-9cbe-7f69dcb1756a	672c56e3-b3da-482b-8f39-382a5170379d	Bouye	1L	16	2026-05-21 00:00:00		2026-05-27 11:44:16.323
fd5a72b3-eb06-4609-a304-1ef55ee5292e	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	1L	13	2026-05-21 00:00:00		2026-05-27 11:46:19.053
056896df-da0b-453c-bd5c-638095794766	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	1L	17	2026-05-25 00:00:00		2026-05-27 11:47:51.029
6a3a99d4-39b5-4671-a654-a8a0c186287c	7fbfd51f-2cd3-40af-9ffa-d3fa8452ba54	Bissap Rouge	1L	3	2026-05-21 00:00:00	c'est le reste de la production avant le mise en place du systeme	2026-05-27 14:01:26.445
b2cd5b72-5368-458b-b1de-1e5ae27e93d8	7fbfd51f-2cd3-40af-9ffa-d3fa8452ba54	Bissap Rouge	250ml	3	2026-05-20 00:00:00	c'est le reste de la production avant le mise en place du systeme	2026-05-27 14:01:51.802
d5ec32aa-d93e-446e-9a5e-68d6054c42a0	a2f9b2ad-bb7c-4447-b7e7-af59a4d755e0	Pina colada	250ml	6	2026-05-20 00:00:00	c'est le reste de la production avant le mise en place du systeme	2026-05-27 14:02:44.359
9bc9a4e0-5c2f-45b6-b72b-4cf567f3b5bc	d24067c1-44bb-4f30-b81a-00dd11a28378	Orange carotte	250ml	5	2026-05-20 00:00:00	c'est le reste de la production avant le mise en place du systeme	2026-05-27 14:02:20.794
c6fec319-fc34-4bad-89a8-07c12fc98d0e	7fbfd51f-2cd3-40af-9ffa-d3fa8452ba54	Bissap Rouge	1L	6	2026-06-02 00:00:00		2026-06-02 16:41:31.473
c1b6c9a5-fbcb-4a99-bc68-73126e3be29e	7fbfd51f-2cd3-40af-9ffa-d3fa8452ba54	Bissap Rouge	250ml	7	2026-06-02 00:00:00		2026-06-02 16:42:01.917
5d7b1251-00cf-4e69-8124-0f6495185452	672c56e3-b3da-482b-8f39-382a5170379d	Bouye	1L	3	2026-06-02 00:00:00		2026-06-02 16:43:44.091
eee458de-56e9-4ae1-8d90-88dd929a1780	672c56e3-b3da-482b-8f39-382a5170379d	Bouye	250ml	7	2026-06-02 00:00:00		2026-06-02 16:44:26.268
822e8772-d565-484e-b2b3-05ca775fe147	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	1L	23	2026-06-02 00:00:00		2026-06-02 16:45:20.697
ffda0617-479c-4018-9bba-4beaf3966732	93a3502a-a2aa-4812-a80b-215a0244053e	Mangue lait	1L	8	2026-06-02 00:00:00		2026-06-02 16:46:05.18
3f49db2b-ad57-4242-a635-089aa5450e7e	93a3502a-a2aa-4812-a80b-215a0244053e	Mangue lait	250ml	2	2026-06-02 00:00:00		2026-06-02 16:46:53.022
44a4631d-5a8b-4939-ba5a-0a7afe317a8e	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	250ml	9	2026-06-02 00:00:00		2026-06-02 16:45:40.942
\.


--
-- Data for Name: Sale; Type: TABLE DATA; Schema: public; Owner: yowell_db_user
--

COPY public."Sale" (id, "clientId", "clientName", "orderedAt", "totalAmount", "paymentStatus", notes, "createdAt", "updatedAt", "discountAmount", personalization, kind, "paymentChannel") FROM stdin;
07e219e7-cf47-407c-89a4-b44c64359cc5	be7b7c35-2375-466e-9293-3686b8377889	Mominatou	2026-05-25 00:00:00	6000	PAID	Livré et payé par wave	2026-05-28 07:36:22.8	2026-06-01 14:57:12.079	0	f	SALE	WAVE
cfc59ba9-c5ab-4b99-9180-390cc8d79ade	d696e870-3b87-441c-9697-e8d592a6ed82	Yaye Faty Tall	2026-05-25 00:00:00	21000	PAID	livré	2026-05-28 07:38:06.264	2026-06-01 14:59:29.492	0	f	SALE	WAVE
bf4ad353-99c9-4835-b4c7-9e4ad8cf616b	8f60e2eb-227b-4da4-8b42-264232794abd	Tékhé Dieye	2026-05-25 00:00:00	6000	PAID	Livré	2026-05-28 07:40:02.635	2026-06-01 15:16:18.673	0	f	SALE	WAVE
a4f5d3d5-4596-4a88-8985-9f4704e47a83	882c219d-5b8f-4b6c-8ae7-2f3926bb3f1b	Dieynaba Tall	2026-05-22 00:00:00	40000	PAID	Livré et payé cash	2026-05-28 07:28:33.286	2026-06-01 15:17:10.668	1000	f	SALE	CASH
b2e31b93-0f1f-401c-9893-6b6408843a17	33d34ab2-a021-4c98-933a-f3bf38671b5e	Mohamed Charara	2026-05-25 00:00:00	9000	PAID	Livré	2026-05-28 07:30:36.728	2026-06-01 22:27:01.995	0	f	SALE	WAVE
2c656a32-5233-4fd6-9080-d077d7e939a3	578c6066-577a-4a44-98b7-12244227cb23	Ramata B. A. Dieye	2026-06-02 00:00:00	15900	PAID		2026-06-02 10:13:42.678	2026-06-02 10:13:48.902	0	f	SALE	WAVE
19ba709c-fe03-42dd-9743-441155b4671e	07717e29-e87c-46f1-9db3-f1bd529222d7	Ramatoulaye TALL	2026-05-25 00:00:00	15000	PAID	Livré et payé wave	2026-05-28 07:35:03.848	2026-06-02 18:44:10.473	0	f	SALE	WAVE
582044fb-efb9-4269-b7d0-07b934006526	24270523-d8d2-4791-8ef9-d662fa0e13a7	Ndeye Awa Diame	2026-05-22 00:00:00	14000	PAID	Livré et payé par wave	2026-05-28 07:26:49.588	2026-06-02 18:44:51.975	0	f	SALE	WAVE
8184a0c8-9596-4d76-b5b5-565caa911c8f	2e5e8954-68aa-46bf-8f43-d542d16461c6	Aicha Gamby	2026-05-30 00:00:00	13750	PAID		2026-05-30 15:09:21.298	2026-06-03 09:54:02.442	0	t	SALE	WAVE
c762044a-3df5-493b-b7bb-873ff8222a33	882c219d-5b8f-4b6c-8ae7-2f3926bb3f1b	Dieynaba Tall	2026-06-02 00:00:00	0	PAID		2026-06-03 11:41:48.533	2026-06-03 11:41:52.473	4300	f	SALE	CASH
7efc7465-d49f-4f6c-add8-211ecd1446b6	d696e870-3b87-441c-9697-e8d592a6ed82	Yaye Faty Tall	2026-06-03 00:00:00	0	PAID		2026-06-03 11:45:11.33	2026-06-03 11:45:14.121	3950	f	SALE	CASH
b3936aa3-c770-4254-8ded-a6294023d04e	882c219d-5b8f-4b6c-8ae7-2f3926bb3f1b	Dieynaba Tall	2026-06-02 00:00:00	30000	PAID		2026-06-05 14:22:11.76	2026-06-05 14:23:16.321	0	f	SALE	CASH
39ea55df-1f75-4a7a-ae20-46ec72390e8a	33d34ab2-a021-4c98-933a-f3bf38671b5e	Mohamed Charara	2026-06-04 00:00:00	9000	UNPAID		2026-06-04 13:52:16.399	2026-06-04 13:52:16.399	0	f	SALE	\N
408c69db-e59a-4307-a28c-510fddfd4426	4fcf8833-e24c-46e5-961e-9af3ff7c8b6c	Mapote Wade	2026-06-04 00:00:00	9000	UNPAID	gardé, à livrer le 08/06/26	2026-06-04 21:13:48.575	2026-06-04 21:13:48.575	0	f	SALE	\N
c2224c8f-833e-473e-be66-9dd1265f7951	a0f2659f-f7f7-4d74-a830-0183c298a868	Djena Kouyaté	2026-06-04 00:00:00	21000	PAID	Elle a envoyé 23 000 Yo'Well lui a envoyé la monnaie 3000 FCFA	2026-06-04 13:21:34.789	2026-06-05 11:09:39.041	0	f	SALE	OM
\.


--
-- Data for Name: SaleItem; Type: TABLE DATA; Schema: public; Owner: yowell_db_user
--

COPY public."SaleItem" (id, "saleId", "productId", "productName", volume, quantity, "unitPrice", "lineTotal", "createdAt") FROM stdin;
3d9b7e35-5a62-482c-9a75-c6901985c100	b2e31b93-0f1f-401c-9893-6b6408843a17	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	1L	3	3000	9000	2026-05-28 07:30:36.728
bbc679da-27e3-4f3b-9528-0b25597e175b	8184a0c8-9596-4d76-b5b5-565caa911c8f	7fbfd51f-2cd3-40af-9ffa-d3fa8452ba54	Bissap Rouge	250ml	6	500	3000	2026-05-30 15:09:21.298
08eaed1b-b217-4c1d-83cf-de7cdb0f68e0	8184a0c8-9596-4d76-b5b5-565caa911c8f	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	250ml	7	750	5250	2026-05-30 15:09:21.298
171046cc-720e-4713-ad1d-9f64447adc1e	8184a0c8-9596-4d76-b5b5-565caa911c8f	672c56e3-b3da-482b-8f39-382a5170379d	Bouye	250ml	7	500	3500	2026-05-30 15:09:21.298
c5b35b90-c752-408e-9d58-768324c1fc5b	07e219e7-cf47-407c-89a4-b44c64359cc5	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	1L	2	3000	6000	2026-06-01 14:57:12.079
d54f99f1-7f51-43e0-8455-9664585634df	cfc59ba9-c5ab-4b99-9180-390cc8d79ade	672c56e3-b3da-482b-8f39-382a5170379d	Bouye	1L	3	2000	6000	2026-06-01 14:59:29.492
ddfb6354-2a49-4dae-971d-1ecba4d2b994	cfc59ba9-c5ab-4b99-9180-390cc8d79ade	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	1L	5	3000	15000	2026-06-01 14:59:29.492
93612f8d-cf95-4867-a802-e81112485e6d	bf4ad353-99c9-4835-b4c7-9e4ad8cf616b	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	1L	2	3000	6000	2026-06-01 15:16:18.673
7462925f-dbc2-4ba3-883e-5bc6abfec5a4	a4f5d3d5-4596-4a88-8985-9f4704e47a83	7fbfd51f-2cd3-40af-9ffa-d3fa8452ba54	Bissap Rouge	1L	1	2000	2000	2026-06-01 15:17:10.668
f484ebe0-8079-4cf4-9049-b5dc097c6a48	a4f5d3d5-4596-4a88-8985-9f4704e47a83	672c56e3-b3da-482b-8f39-382a5170379d	Bouye	1L	9	2000	18000	2026-06-01 15:17:10.668
7c3a5c35-81da-420e-a036-81a15299e50b	a4f5d3d5-4596-4a88-8985-9f4704e47a83	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	1L	7	3000	21000	2026-06-01 15:17:10.668
74eb5155-a340-4f91-94d9-ec96466d6525	2c656a32-5233-4fd6-9080-d077d7e939a3	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	1L	4	3000	12000	2026-06-02 10:13:42.678
d6846ef7-6df2-49fe-936c-e0257af84ed9	2c656a32-5233-4fd6-9080-d077d7e939a3	d24067c1-44bb-4f30-b81a-00dd11a28378	Orange carotte	250ml	3	650	1950	2026-06-02 10:13:42.678
01839258-6090-400e-ac81-6f80672dcad4	2c656a32-5233-4fd6-9080-d077d7e939a3	a2f9b2ad-bb7c-4447-b7e7-af59a4d755e0	Pina colada	250ml	3	650	1950	2026-06-02 10:13:42.678
e7881a92-fb07-4cda-a7a5-f256210f4148	19ba709c-fe03-42dd-9743-441155b4671e	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	1L	5	3000	15000	2026-06-02 18:44:10.473
24de433c-961d-4529-8f0f-11c3b41fb069	582044fb-efb9-4269-b7d0-07b934006526	7fbfd51f-2cd3-40af-9ffa-d3fa8452ba54	Bissap Rouge	1L	2	2000	4000	2026-06-02 18:44:51.975
e19dd06a-9c17-485c-bbd6-93cd3d808dd2	582044fb-efb9-4269-b7d0-07b934006526	672c56e3-b3da-482b-8f39-382a5170379d	Bouye	1L	2	2000	4000	2026-06-02 18:44:51.975
498405b5-a0cb-47d4-8f86-d48a35d4189b	582044fb-efb9-4269-b7d0-07b934006526	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	1L	2	3000	6000	2026-06-02 18:44:51.975
a1d3b412-0da6-4b88-bbff-980c824d57a9	c762044a-3df5-493b-b7bb-873ff8222a33	7fbfd51f-2cd3-40af-9ffa-d3fa8452ba54	Bissap Rouge	250ml	3	500	1500	2026-06-03 11:41:48.533
aaac6307-52b9-45cd-b6c7-cd287c27bedb	c762044a-3df5-493b-b7bb-873ff8222a33	a2f9b2ad-bb7c-4447-b7e7-af59a4d755e0	Pina colada	250ml	1	650	650	2026-06-03 11:41:48.533
a5b54c8c-dc41-4f73-b8b4-1635187a2b18	c762044a-3df5-493b-b7bb-873ff8222a33	d24067c1-44bb-4f30-b81a-00dd11a28378	Orange carotte	250ml	1	650	650	2026-06-03 11:41:48.533
d1c84e25-9650-4301-80b2-f58684baf415	c762044a-3df5-493b-b7bb-873ff8222a33	93a3502a-a2aa-4812-a80b-215a0244053e	Mangue lait	250ml	1	750	750	2026-06-03 11:41:48.533
c8513c63-6633-4873-8c78-f142d995a87f	c762044a-3df5-493b-b7bb-873ff8222a33	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	250ml	1	750	750	2026-06-03 11:41:48.533
ad5680a3-d8c6-4743-9c06-43b3dbd6fbfb	7efc7465-d49f-4f6c-add8-211ecd1446b6	7fbfd51f-2cd3-40af-9ffa-d3fa8452ba54	Bissap Rouge	250ml	1	500	500	2026-06-03 11:45:11.33
f14f063e-e268-4d00-af34-130f8c29e039	7efc7465-d49f-4f6c-add8-211ecd1446b6	a2f9b2ad-bb7c-4447-b7e7-af59a4d755e0	Pina colada	250ml	2	650	1300	2026-06-03 11:45:11.33
16773eb6-13f3-4b22-a85f-ae4686044766	7efc7465-d49f-4f6c-add8-211ecd1446b6	d24067c1-44bb-4f30-b81a-00dd11a28378	Orange carotte	250ml	1	650	650	2026-06-03 11:45:11.33
e9ff2f2a-02ff-4eef-8abf-80e2f4ea1f35	7efc7465-d49f-4f6c-add8-211ecd1446b6	93a3502a-a2aa-4812-a80b-215a0244053e	Mangue lait	250ml	1	750	750	2026-06-03 11:45:11.33
51dc45ca-81a7-4d13-82e0-fe7ee459c914	7efc7465-d49f-4f6c-add8-211ecd1446b6	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	250ml	1	750	750	2026-06-03 11:45:11.33
556b4670-b19c-4bff-b234-2651d1db07cd	39ea55df-1f75-4a7a-ae20-46ec72390e8a	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	1L	3	3000	9000	2026-06-04 13:52:16.399
e7dbaf9a-42b2-46e5-830f-06d07aa6da36	408c69db-e59a-4307-a28c-510fddfd4426	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	1L	3	3000	9000	2026-06-04 21:13:48.575
6e572c3c-5b66-41a2-a67f-86cf5409acaf	c2224c8f-833e-473e-be66-9dd1265f7951	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	1L	4	3000	12000	2026-06-05 11:09:39.041
2886c04c-96a6-4ae1-8809-d5fa943505cc	c2224c8f-833e-473e-be66-9dd1265f7951	93a3502a-a2aa-4812-a80b-215a0244053e	Mangue lait	1L	3	3000	9000	2026-06-05 11:09:39.041
9a83290f-00c6-4e45-a0c5-389770a135cc	b3936aa3-c770-4254-8ded-a6294023d04e	93a3502a-a2aa-4812-a80b-215a0244053e	Mangue lait	1L	5	3000	15000	2026-06-05 14:23:16.321
cfa3488b-f4cc-4604-8f0d-37777fcbb7e8	b3936aa3-c770-4254-8ded-a6294023d04e	799dd480-bc01-4887-a389-f81f5cadb5b7	Maad Passion	1L	5	3000	15000	2026-06-05 14:23:16.321
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: yowell_db_user
--

COPY public."User" (id, email, name, "passwordHash", role, active, "createdAt", "updatedAt", permissions) FROM stdin;
e8ecad92-31ef-43dc-986b-033329feb99d	mami@yowell.com	Mami Dieye	$2b$10$s38hxTwzXFKzSd08Z6dvdeFFRv8QjMVhfhcMFGnW3x1RCKb.W6uFy	STAFF	t	2026-05-27 01:08:41.49	2026-05-27 01:08:41.49	{}
2f167967-15f5-4dd8-978c-4be44a7f1de0	amina@yowell.com	amina sow	$2b$10$rWsRC6JGiVzQnVu9bpAXbOXXnySQFK4RkL1yYa/whahNXlVHv4TK.	STAFF	t	2026-05-27 00:45:39.169	2026-06-04 22:46:56.489	{COMPTABILITE,COURSE}
ce67fca4-7cb6-4c6f-b433-1da93a108a98	fatima@yowell.com	Fatimata Sy	$2b$10$hls5U.nAAwGYyMoXTIeRe.1BaZO87h2845dvqxkmFz8pYG.go.EH2	STAFF	t	2026-05-27 01:06:17.58	2026-06-04 22:47:05.852	{VENTE_CLIENTS}
bf183b25-4024-47aa-9232-e33885d05dc6	adja@yowell.com	Hadja Sy	$2b$10$Elxvk5dvY9rIn.2WHIAe0OpPsJyEw8mOJfRqxMIlOiPwPps7xcb0a	STAFF	t	2026-05-27 01:07:23.49	2026-06-04 22:48:37.847	{STOCK}
58af77ae-7af1-4d59-bc31-08a23088dd1c	adjasy@yowell.com	Adja Fatimata Sy	$2b$10$DV19sy6crknxKbDQqahriu.c7hYrxzD1jCQ/eSjPsGLPwkkKBO/s6	STAFF	t	2026-05-27 01:07:57.88	2026-06-04 22:48:57.129	{}
572e7a16-5b7b-4fe5-8763-4a49ac6483ac	admin@yowell.fr	Administrateur	$2b$10$.rew7hJHmvn4TYZ1xGtHI.quFvK1SCZ31RcrNzzl.oTTYj/YYVqLu	ADMIN	t	2026-05-27 00:39:07.19	2026-06-05 13:07:03.072	{}
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: yowell_db_user
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
\.


--
-- Name: AccountingState AccountingState_pkey; Type: CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."AccountingState"
    ADD CONSTRAINT "AccountingState_pkey" PRIMARY KEY (id);


--
-- Name: ActivityLog ActivityLog_pkey; Type: CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_pkey" PRIMARY KEY (id);


--
-- Name: Client Client_pkey; Type: CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_pkey" PRIMARY KEY (id);


--
-- Name: DeliveryRunFee DeliveryRunFee_pkey; Type: CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."DeliveryRunFee"
    ADD CONSTRAINT "DeliveryRunFee_pkey" PRIMARY KEY (id);


--
-- Name: DeliveryRunItem DeliveryRunItem_pkey; Type: CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."DeliveryRunItem"
    ADD CONSTRAINT "DeliveryRunItem_pkey" PRIMARY KEY (id);


--
-- Name: DeliveryRun DeliveryRun_pkey; Type: CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."DeliveryRun"
    ADD CONSTRAINT "DeliveryRun_pkey" PRIMARY KEY (id);


--
-- Name: ManualAccountingEntry ManualAccountingEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."ManualAccountingEntry"
    ADD CONSTRAINT "ManualAccountingEntry_pkey" PRIMARY KEY (id);


--
-- Name: ProductFormat ProductFormat_pkey; Type: CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."ProductFormat"
    ADD CONSTRAINT "ProductFormat_pkey" PRIMARY KEY (id);


--
-- Name: ProductPhoto ProductPhoto_pkey; Type: CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."ProductPhoto"
    ADD CONSTRAINT "ProductPhoto_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: ProductionRecord ProductionRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."ProductionRecord"
    ADD CONSTRAINT "ProductionRecord_pkey" PRIMARY KEY (id);


--
-- Name: SaleItem SaleItem_pkey; Type: CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."SaleItem"
    ADD CONSTRAINT "SaleItem_pkey" PRIMARY KEY (id);


--
-- Name: Sale Sale_pkey; Type: CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: ActivityLog_action_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "ActivityLog_action_idx" ON public."ActivityLog" USING btree (action);


--
-- Name: ActivityLog_createdAt_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "ActivityLog_createdAt_idx" ON public."ActivityLog" USING btree ("createdAt");


--
-- Name: ActivityLog_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "ActivityLog_userId_createdAt_idx" ON public."ActivityLog" USING btree ("userId", "createdAt");


--
-- Name: Client_createdAt_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "Client_createdAt_idx" ON public."Client" USING btree ("createdAt");


--
-- Name: Client_name_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "Client_name_idx" ON public."Client" USING btree (name);


--
-- Name: DeliveryRunFee_runId_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "DeliveryRunFee_runId_idx" ON public."DeliveryRunFee" USING btree ("runId");


--
-- Name: DeliveryRunItem_hasRemaining_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "DeliveryRunItem_hasRemaining_idx" ON public."DeliveryRunItem" USING btree ("hasRemaining");


--
-- Name: DeliveryRunItem_runId_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "DeliveryRunItem_runId_idx" ON public."DeliveryRunItem" USING btree ("runId");


--
-- Name: DeliveryRun_createdAt_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "DeliveryRun_createdAt_idx" ON public."DeliveryRun" USING btree ("createdAt");


--
-- Name: DeliveryRun_date_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "DeliveryRun_date_idx" ON public."DeliveryRun" USING btree (date);


--
-- Name: DeliveryRun_paymentChannel_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "DeliveryRun_paymentChannel_idx" ON public."DeliveryRun" USING btree ("paymentChannel");


--
-- Name: ManualAccountingEntry_createdAt_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "ManualAccountingEntry_createdAt_idx" ON public."ManualAccountingEntry" USING btree ("createdAt");


--
-- Name: ManualAccountingEntry_date_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "ManualAccountingEntry_date_idx" ON public."ManualAccountingEntry" USING btree (date);


--
-- Name: ManualAccountingEntry_type_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "ManualAccountingEntry_type_idx" ON public."ManualAccountingEntry" USING btree (type);


--
-- Name: ProductFormat_enabled_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "ProductFormat_enabled_idx" ON public."ProductFormat" USING btree (enabled);


--
-- Name: ProductFormat_productId_volume_key; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE UNIQUE INDEX "ProductFormat_productId_volume_key" ON public."ProductFormat" USING btree ("productId", volume);


--
-- Name: ProductPhoto_productId_position_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "ProductPhoto_productId_position_idx" ON public."ProductPhoto" USING btree ("productId", "position");


--
-- Name: Product_createdAt_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "Product_createdAt_idx" ON public."Product" USING btree ("createdAt");


--
-- Name: Product_name_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "Product_name_idx" ON public."Product" USING btree (name);


--
-- Name: ProductionRecord_createdAt_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "ProductionRecord_createdAt_idx" ON public."ProductionRecord" USING btree ("createdAt");


--
-- Name: ProductionRecord_producedAt_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "ProductionRecord_producedAt_idx" ON public."ProductionRecord" USING btree ("producedAt");


--
-- Name: ProductionRecord_productId_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "ProductionRecord_productId_idx" ON public."ProductionRecord" USING btree ("productId");


--
-- Name: SaleItem_productId_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "SaleItem_productId_idx" ON public."SaleItem" USING btree ("productId");


--
-- Name: SaleItem_saleId_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "SaleItem_saleId_idx" ON public."SaleItem" USING btree ("saleId");


--
-- Name: Sale_clientId_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "Sale_clientId_idx" ON public."Sale" USING btree ("clientId");


--
-- Name: Sale_createdAt_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "Sale_createdAt_idx" ON public."Sale" USING btree ("createdAt");


--
-- Name: Sale_kind_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "Sale_kind_idx" ON public."Sale" USING btree (kind);


--
-- Name: Sale_orderedAt_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "Sale_orderedAt_idx" ON public."Sale" USING btree ("orderedAt");


--
-- Name: Sale_paymentChannel_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "Sale_paymentChannel_idx" ON public."Sale" USING btree ("paymentChannel");


--
-- Name: Sale_paymentStatus_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "Sale_paymentStatus_idx" ON public."Sale" USING btree ("paymentStatus");


--
-- Name: User_active_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "User_active_idx" ON public."User" USING btree (active);


--
-- Name: User_createdAt_idx; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE INDEX "User_createdAt_idx" ON public."User" USING btree ("createdAt");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: yowell_db_user
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: ActivityLog ActivityLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DeliveryRunFee DeliveryRunFee_runId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."DeliveryRunFee"
    ADD CONSTRAINT "DeliveryRunFee_runId_fkey" FOREIGN KEY ("runId") REFERENCES public."DeliveryRun"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DeliveryRunItem DeliveryRunItem_runId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."DeliveryRunItem"
    ADD CONSTRAINT "DeliveryRunItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES public."DeliveryRun"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductFormat ProductFormat_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."ProductFormat"
    ADD CONSTRAINT "ProductFormat_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductPhoto ProductPhoto_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."ProductPhoto"
    ADD CONSTRAINT "ProductPhoto_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SaleItem SaleItem_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yowell_db_user
--

ALTER TABLE ONLY public."SaleItem"
    ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."Sale"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON SEQUENCES TO yowell_db_user;


--
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TYPES TO yowell_db_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON FUNCTIONS TO yowell_db_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TABLES TO yowell_db_user;


--
-- PostgreSQL database dump complete
--

\unrestrict M6NzlC4ZGMQJa9H2PKNmtn1UhLCutH8wRQYXvMf95mg3EQQqQcwnmAjh9LrE8V3


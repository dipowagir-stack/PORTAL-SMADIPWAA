# School Media Engine Architecture

## 1. Analysis
The Media Engine acts as a specialized Digital Asset Management (DAM) subsystem that extends the core File Engine within the Enterprise School Management Platform (School OS). While the File Engine treats all uploads as opaque binary blobs, the Media Engine intrinsically understands the contents of multimedia (Images, Videos, Audio, Animations). It is responsible for processing, transcoding, optimizing, and securely delivering these assets at scale. By abstracting media complexities (e.g., adaptive video streaming, image compression, metadata extraction), it ensures that business modules—whether it's the Academic module delivering video lectures or the Communications module rendering newsletters—can consume highly optimized, responsive media without writing any media-handling logic.

## 2. Architecture Design
The Media Engine employs an asynchronous, event-driven pipeline optimized for heavy computational workloads. When media is ingested via the Media Manager, the original asset is safely persisted via the File Engine. Concurrently, the Processing Manager dispatches background jobs to specialized handlers (Image, Video, Audio managers) based on MIME types. These handlers utilize the Optimization and Thumbnail managers to generate web-ready variants (e.g., multiple resolutions, HLS streams). The Metadata Manager extracts embedded data (EXIF, ID3), while the AI Processing Adapter can trigger semantic analysis (OCR, facial recognition). Final delivery is orchestrated through the Streaming Manager and CDN Adapter, all rigorously protected by the Security Manager.

## 3. Folder Structure
```text
src/
└── services/
    └── media/
        ├── core/            # Media Manager, Processing Manager, Version Manager
        ├── handlers/        # Image Manager, Video Manager, Audio Manager
        ├── optimization/    # Optimization Manager, Thumbnail Manager, Preview Manager
        ├── delivery/        # Streaming Manager, CDN Adapter
        ├── data/            # Metadata Manager, Classification Manager, Search Adapter
        ├── intelligence/    # AI Processing Adapter
        ├── governance/      # Security Manager
        └── shared/          # Shared Components (Codecs, Resolutions, Enums)
```

## 4. Media Engine Components

---

### 4.1 Media Manager
**1. Purpose:** Act as the central orchestrator and entry point for all media-related operations.
**2. Responsibilities:** Route incoming media payloads to the appropriate handlers based on type, coordinate the end-to-end processing pipeline, and serve as the primary integration point for all business modules requesting media operations.
**3. Inputs:** Raw Media Streams, Processing Directives, Metadata.
**4. Outputs:** Media Identifiers, Pipeline Status Updates, Delivery URLs.
**5. Dependencies:** File Engine (for raw storage), Processing Manager, Metadata Manager.
**6. Failure Handling:** Gracefully handles unsupported formats by falling back to standard File Engine behavior (treating the media as a standard binary attachment).
**7. Security Considerations:** Ensures all media requests possess valid authorization tokens before initiating resource-intensive pipelines.
**8. Performance Considerations:** Uses asynchronous non-blocking I/O to immediately acknowledge uploads while pushing heavy processing to background workers.
**9. Future Extensibility:** Pluggable format registries to support emerging immersive formats (e.g., Apple Spatial Video, WebXR assets).

---

### 4.2 Image Manager
**1. Purpose:** Handle all image-specific manipulations and transformations.
**2. Responsibilities:** Execute resizing, cropping, rotation, format conversion (e.g., PNG to WebP/AVIF), and dynamic watermarking (e.g., overlaying a school logo on public gallery photos).
**3. Inputs:** Raw Image Binaries, Transformation Parameters.
**4. Outputs:** Processed Image Variants.
**5. Dependencies:** Processing Manager, Optimization Manager.
**6. Failure Handling:** Rejects corrupted image headers with clear validation errors; falls back to original if transformation fails.
**7. Security Considerations:** Prevents ImageTragick and other image-parsing vulnerabilities by utilizing hardened, sandboxed graphics libraries (e.g., libvips).
**8. Performance Considerations:** Performs transformations in-memory using highly optimized C/C++ bindings rather than slow interpreted libraries.
**9. Future Extensibility:** Dynamic, URL-based on-the-fly transformations (e.g., `image.jpg?w=300&h=300&fit=crop`) powered by edge computing.

---

### 4.3 Video Manager
**1. Purpose:** Manage complex video processing, transcoding, and packaging.
**2. Responsibilities:** Transcode original videos into multiple resolutions (1080p, 720p, 480p) and bitrates, segment files for adaptive streaming, and extract closed captions.
**3. Inputs:** Raw Video Binaries, Transcoding Profiles.
**4. Outputs:** Video Segments, Manifest Files, Transcoded MP4s.
**5. Dependencies:** Processing Manager, File Engine.
**6. Failure Handling:** Implements chunk-level retries; if a specific resolution transcode fails, the pipeline completes with the surviving resolutions.
**7. Security Considerations:** Scans video headers to prevent buffer overflow attacks embedded in malicious video files.
**8. Performance Considerations:** Offloads transcoding to dedicated GPU-accelerated worker clusters to prevent CPU exhaustion on the main application servers.
**9. Future Extensibility:** Integration with cloud encoding services (e.g., AWS Elemental MediaConvert) for massive scale graduation livestreams.

---

### 4.4 Audio Manager
**1. Purpose:** Handle the processing and optimization of audio assets.
**2. Responsibilities:** Normalize audio levels, convert raw audio (WAV/FLAC) to highly compressed streaming formats (AAC/MP3), strip noise, and extract waveforms for visual UI rendering.
**3. Inputs:** Raw Audio Binaries, Target Bitrates.
**4. Outputs:** Optimized Audio Streams, Waveform Data.
**5. Dependencies:** Processing Manager.
**6. Failure Handling:** Falls back to original audio format if transcoding to a specific codec fails.
**7. Security Considerations:** Validates audio container structures to prevent malware masquerading as audio files.
**8. Performance Considerations:** Extremely fast processing compared to video; can be handled on standard worker nodes.
**9. Future Extensibility:** Auto-ducking (automatically lowering background music volume when speech is detected in podcasts or announcements).

---

### 4.5 Thumbnail Manager
**1. Purpose:** Provide immediate visual context for all media types.
**2. Responsibilities:** Generate static thumbnail grids, animated GIF previews (for video scrubbers), and extract keyframes from videos, PDFs, or presentations.
**3. Inputs:** Original Media Binaries, Extraction Timestamps/Pages.
**4. Outputs:** Lightweight Thumbnail Images.
**5. Dependencies:** Image Manager, Video Manager.
**6. Failure Handling:** Returns a generic placeholder icon (e.g., a "Video" or "Document" icon) if thumbnail extraction fails.
**7. Security Considerations:** Ensures thumbnails do not bypass classification rules (e.g., a thumbnail of a confidential document inherits the document's restrictions).
**8. Performance Considerations:** Thumbnail extraction happens immediately during the initial upload phase to ensure the UI feels responsive.
**9. Future Extensibility:** Smart thumbnailing utilizing AI to automatically select the most visually interesting or representative frame of a video.

---

### 4.6 Processing Manager
**1. Purpose:** Orchestrate the asynchronous, heavy-lifting computational tasks.
**2. Responsibilities:** Queue, distribute, monitor, and retry media processing jobs across background worker nodes. Manage the state of multi-step pipelines (e.g., Transcode -> Watermark -> CDN Push).
**3. Inputs:** Job Definitions (Media IDs, Target Managers, Profiles).
**4. Outputs:** Job Status Events, Pipeline Completions.
**5. Dependencies:** Core Event Bus, Platform Scheduler Engine (for retries).
**6. Failure Handling:** Employs Dead Letter Queues (DLQ) for permanently failed processing jobs and alerts administrators.
**7. Security Considerations:** Workers run in highly isolated environments to prevent lateral movement if a malicious media file compromises a worker node.
**8. Performance Considerations:** Horizontal scalability; workers can be dynamically spun up or down based on queue depth (e.g., scaling up during end-of-semester assignment submissions).
**9. Future Extensibility:** Serverless orchestration (e.g., AWS Step Functions) for infinite, zero-maintenance scaling of processing pipelines.

---

### 4.7 Optimization Manager
**1. Purpose:** Ensure the fastest possible media delivery to end-users while minimizing storage costs.
**2. Responsibilities:** Apply lossless and lossy compression algorithms, strip unnecessary metadata (unless requested), and optimize delivery formats based on the requesting browser's capabilities (e.g., serving AVIF to Chrome, WebP to Safari).
**3. Inputs:** Processed Media Binaries.
**4. Outputs:** Highly Compressed Media Variants.
**5. Dependencies:** Image/Video/Audio Managers.
**6. Failure Handling:** Silently falls back to the unoptimized version if compression algorithms encounter unparseable edge cases.
**7. Security Considerations:** Strips embedded EXIF GPS coordinates from photos by default to protect student privacy.
**8. Performance Considerations:** Drastically reduces bandwidth consumption and CDN egress costs for the school.
**9. Future Extensibility:** Perceptual encoding (using machine learning to compress a video based on human visual perception models, saving up to 50% more bandwidth).

---

### 4.8 Streaming Manager
**1. Purpose:** Deliver long-form media efficiently and securely to end-user devices.
**2. Responsibilities:** Generate HLS (HTTP Live Streaming) or MPEG-DASH manifests, handle adaptive bitrate switching (seamlessly shifting video quality based on the user's internet speed), and manage byte-range requests.
**3. Inputs:** Segmented Video/Audio Files, Client Bandwidth telemetry.
**4. Outputs:** Streaming Manifests (m3u8, mpd), Media Chunks.
**5. Dependencies:** Video Manager, CDN Adapter.
**6. Failure Handling:** Adaptive logic automatically downgrades the user to a lower resolution stream if network congestion is detected, preventing buffering freezes.
**7. Security Considerations:** Integrates with the Security Manager to apply signed cookies or tokens to individual stream segments, preventing unauthorized hotlinking.
**8. Performance Considerations:** Ensures massive video files are not loaded into memory entirely; segments are served as small, highly cacheable HTTP chunks.
**9. Future Extensibility:** WebRTC integration for ultra-low latency live streaming of school assemblies or remote classrooms.

---

### 4.9 Metadata Manager
**1. Purpose:** Extract, store, and manage the embedded data within media files.
**2. Responsibilities:** Parse EXIF (Camera, Location, Exposure), ID3 (Artist, Album), and Codec information (Framerate, Color Space, Bitrate).
**3. Inputs:** Raw Media Binaries.
**4. Outputs:** Structured JSON Metadata.
**5. Dependencies:** Core Database (for metadata persistence).
**6. Failure Handling:** Stores available metadata and logs parsing errors without failing the overall media upload.
**7. Security Considerations:** Acts as the enforcer for stripping specific metadata (e.g., removing author names from documents before blind grading).
**8. Performance Considerations:** Metadata extraction occurs in a lightweight pre-processing step before heavy transcoding begins.
**9. Future Extensibility:** Automated extraction of closed captions and subtitles from video tracks into searchable metadata fields.

---

### 4.10 Classification Manager
**1. Purpose:** Categorize media assets for governance, safety, and organization.
**2. Responsibilities:** Apply taxonomies based on AI insights (e.g., tagging a photo as "Sports", "Graduation") and enforce safety guidelines by classifying explicit or inappropriate content.
**3. Inputs:** Extracted Metadata, AI Processing Results.
**4. Outputs:** Applied Tags, Classification Flags (e.g., NSFW, Confidential).
**5. Dependencies:** AI Processing Adapter, Platform Knowledge Engine.
**6. Failure Handling:** Defaults to "Unclassified" and flags for manual review if automated classification engines timeout.
**7. Security Considerations:** Critical for Child Sexual Abuse Material (CSAM) detection integrations, immediately quarantining flagged media and alerting authorities.
**8. Performance Considerations:** Operates entirely asynchronously as a post-processing step.
**9. Future Extensibility:** Custom classification models trained specifically on the school’s unique taxonomy (e.g., identifying specific school uniforms or campus buildings).

---

### 4.11 Search Adapter
**1. Purpose:** Bridge the Media Engine with the Platform Search Engine.
**2. Responsibilities:** Format media metadata, extracted text (OCR), classifications, and AI tags into search-friendly documents, pushing them to the central Search Engine indices.
**3. Inputs:** Enriched Media Metadata, Transcripts.
**4. Outputs:** Search Index Update Payloads.
**5. Dependencies:** Platform Search Engine.
**6. Failure Handling:** Queues index updates locally if the Search Engine is temporarily unavailable.
**7. Security Considerations:** Ensures media permissions (RLS) are attached to the search payload, preventing unauthorized users from finding restricted media via search.
**8. Performance Considerations:** Employs batching to prevent overwhelming the Search Engine with thousands of individual index requests during bulk media uploads.
**9. Future Extensibility:** Generation of vector embeddings for the media, allowing users to search by semantic intent (e.g., "Show me videos of the science fair").

---

### 4.12 Security Manager
**1. Purpose:** Protect media assets against unauthorized access and piracy.
**2. Responsibilities:** Manage Digital Rights Management (DRM) licensing (e.g., Widevine, FairPlay) for premium content, generate short-lived signed URLs, and validate user access tokens before media delivery.
**3. Inputs:** Media Requests, User Context, DRM License Requests.
**4. Outputs:** Signed URLs, Decryption Keys, Access Decisions.
**5. Dependencies:** Core Permission Engine.
**6. Failure Handling:** Fails closed; denies access if signature validation or DRM licensing servers are unreachable.
**7. Security Considerations:** Protects intellectual property (e.g., proprietary teaching curriculums) from being downloaded and redistributed.
**8. Performance Considerations:** Cryptographic signing operations are heavily optimized and cached to prevent latency during stream initialization.
**9. Future Extensibility:** Forensic watermarking (invisibly encoding the user's ID into the video stream so leaked videos can be traced back to the source).

---

### 4.13 CDN Adapter
**1. Purpose:** Manage the integration with edge delivery networks.
**2. Responsibilities:** Push processed media to Content Delivery Networks (Cloudflare, AWS CloudFront, Akamai), manage cache headers (TTL), and execute targeted cache invalidations when media is updated or deleted.
**3. Inputs:** Processed Media Artifacts, Invalidation Commands.
**4. Outputs:** CDN Cache States, Edge URLs.
**5. Dependencies:** External CDN Providers.
**6. Failure Handling:** Transparently falls back to serving media directly from the origin Storage Manager if the CDN goes offline.
**7. Security Considerations:** Configures CDN edge rules to reject requests that lack valid cryptographic signatures, pushing authorization validation to the edge.
**8. Performance Considerations:** Essential for global performance, pushing heavy media assets to PoPs (Points of Presence) physically closest to the end user.
**9. Future Extensibility:** Multi-CDN strategies, dynamically routing traffic between Cloudflare and CloudFront based on real-time latency and cost metrics.

---

### 4.14 AI Processing Adapter
**1. Purpose:** Augment media assets with artificial intelligence.
**2. Responsibilities:** Route media to AI models for Optical Character Recognition (OCR), Speech-to-Text (auto-captioning), facial recognition (e.g., for automated student attendance via camera), and object detection.
**3. Inputs:** Media Artifacts.
**4. Outputs:** Transcripts, Bounding Boxes, Semantic Tags.
**5. Dependencies:** Platform AI Engine.
**6. Failure Handling:** Gracefully skips AI enrichment if provider APIs rate limit or timeout, allowing standard processing to complete.
**7. Security Considerations:** Strictly governs facial recognition data; ensures biometric models are fully compliant with student privacy laws (e.g., FERPA, GDPR) and require explicit parental consent.
**8. Performance Considerations:** AI processing is heavily resource-intensive and is strictly queued as the lowest priority background task.
**9. Future Extensibility:** Generative AI capabilities (e.g., auto-generating video summaries, translating audio tracks into multiple languages synthetically).

---

### 4.15 Version Manager
**1. Purpose:** Support non-destructive editing and historical preservation of media.
**2. Responsibilities:** Keep the original unoptimized upload safe as the "Master" version, tracking any subsequent edits (crops, trims) as mathematical operations rather than destructive overwrites.
**3. Inputs:** Master Media, Edit Directives.
**4. Outputs:** Rendered New Versions.
**5. Dependencies:** File Engine Version Manager.
**6. Failure Handling:** Prevents corruption of the Master file by only applying edits to working copies.
**7. Security Considerations:** Rollbacks to previous versions respect the current permission state of the media object.
**8. Performance Considerations:** Saves storage space by storing only the "Master" and the mathematical "Edit Recipe" until a user explicitly requests a render of the edited version.
**9. Future Extensibility:** Collaborative, browser-based non-linear video editing timelines directly integrated into the School OS.

---

### 4.16 Preview Manager
**1. Purpose:** Provide fast, low-fidelity renditions for rapid UI browsing.
**2. Responsibilities:** Generate extremely lightweight proxy files (e.g., a heavily blurred 10kb version of a high-res image) that load instantly on mobile devices before the full asset streams in.
**3. Inputs:** Optimized Media Artifacts.
**4. Outputs:** Proxy Files, Blurhashes.
**5. Dependencies:** Image Manager, Optimization Manager.
**6. Failure Handling:** The UI handles missing previews gracefully without breaking the layout.
**7. Security Considerations:** Previews are strictly bound to the same RLS access rules as the full media.
**8. Performance Considerations:** Vastly improves "Time to First Meaningful Paint" metrics on frontend applications, especially in areas with poor mobile connectivity.
**9. Future Extensibility:** Real-time 3D model rendering previews (e.g., WebGL fallback canvases).

---

### 4.17 Shared Components
**1. Purpose:** Maintain the underlying definitions and standards for the Media Engine.
**2. Responsibilities:** Define supported MIME type registries, standard resolution targets (4K, 1080p), bitrate ladders, aspect ratio calculators, and standard DTOs.
**3. Inputs:** N/A (Library level).
**4. Outputs:** Constants, Enums, Utility Functions.
**5. Dependencies:** None.
**6. Failure Handling:** Comprehensive unit testing to prevent logic errors in resolution scaling math.
**7. Security Considerations:** Centralized registry ensures unsupported, potentially dangerous media formats are rejected globally.
**8. Performance Considerations:** N/A.
**9. Future Extensibility:** Easy addition of new emerging video/audio codecs (e.g., AV1, VVC) to the global processing pipeline.

---

## 5. Global Architecture Alignment

### 5.1 Responsibilities
The Media Engine acts as a smart wrapper around the File Engine. While the File Engine handles the *bytes*, the Media Engine handles the *pixels, frames, and frequencies*. It guarantees that when a teacher uploads a 4GB raw video from an iPhone, students on low-bandwidth connections receive a smooth, optimized 480p stream without buffering.

### 5.2 Dependencies
Depends deeply on the **File Engine** for physical storage abstraction. Relies on the **Platform AI Engine** for deep content analysis and the **Core Event Bus** for asynchronous job coordination.

### 5.3 Risks
*   **Runaway Compute Costs:** Video transcoding is highly CPU intensive. *Mitigation:* The Processing Manager strictly limits concurrent transcoding jobs and utilizes preemptible/spot cloud instances for cost savings.
*   **Privacy Violations:** Unintentional extraction and exposure of GPS coordinates from student photos. *Mitigation:* The Optimization Manager strips EXIF location data natively before the media is ever made available for download or viewing.

### 5.4 Migration Strategy
Existing unoptimized media (e.g., massive BMP files or raw MOVs stored in legacy databases) will be migrated to the File Engine, which will then emit "New File" events. The Media Engine will intercept these events, retroactively processing, compressing, and streaming-enabling all legacy content in the background over several weeks.

### 5.5 Future Extensibility
The decoupled nature of the Handlers (Image, Video, Audio) ensures that the platform can easily adopt future media types. If Virtual Reality (VR) 360-degree videos become standard in education, a new `SpatialMediaManager` can be dropped into the pipeline without altering the core Media Manager orchestration logic.

"""Document sync events: CRDT/OT-based collaborative editing ("file:update",
"file:cursor", "file:patch").

TODO(Phase 6): implement using app.realtime.server.sio. Evaluate Yjs (via a
Python CRDT binding) vs. a custom OT log backed by Redis before implementation.
"""

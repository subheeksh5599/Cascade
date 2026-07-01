;; Cascade Registry — on-chain cascade graph store
;;
;; Stores published cascade graph definitions and enables
;; composition: one cascade can route funds into another.
;;
;; Graph data is stored as a compact hash (keccak-256 of
;; the canonical JSON serialization). Full graph definitions
;; live off-chain (IPFS, GitHub, editor URL).

(define-constant ERR_NOT_AUTHORIZED (err u100))
(define-constant ERR_NOT_FOUND (err u101))
(define-constant ERR_ALREADY_EXISTS (err u102))

;; cascade-id → metadata
(define-map cascades
  uint
  {
    creator: principal,
    graph-hash: (buff 32),
    name: (string-ascii 64),
    node-count: uint,
    edge-count: uint,
    created-at: uint,
  }
)

;; cascade-id → execution state (updated per node execution)
(define-map cascade-states
  uint
  {
    node-index: uint,
    root-deposit: uint,
    status: (string-ascii 16),
  }
)

;; cascade-id → node-id → witness
(define-map cascade-witnesses
  {
    cascade-id: uint,
    node-index: uint,
  }
  {
    strategy-tx: (buff 32),
    deposit-tx: (buff 32),
    confirmed-at: uint,
  }
)

;; composed-cascade-id → parent-cascade-id (reverse lookup)
(define-map composition-parents
  uint
  principal
)

(define-data-var next-cascade-id uint u0)

;; ── Public Functions ─────────────────────────────────────────────────────────

(define-read-only (get-next-cascade-id)
  (ok (var-get next-cascade-id))
)

(define-read-only (get-cascade (cascade-id uint))
  (map-get? cascades cascade-id)
)

(define-read-only (get-cascade-state (cascade-id uint))
  (map-get? cascade-states cascade-id)
)

(define-read-only (get-cascade-witness (cascade-id uint) (node-index uint))
  (map-get? cascade-witnesses { cascade-id: cascade-id, node-index: node-index })
)

(define-read-only (get-cascades-by-creator (creator principal))
  (ok (var-get next-cascade-id))
)

;; Register a new cascade graph. Stores the graph-hash and metadata.
;; The full graph definition lives off-chain, referenced by the hash.
(define-public (register-cascade
    (graph-hash (buff 32))
    (name (string-ascii 64))
    (node-count uint)
    (edge-count uint)
  )
  (let ((new-id (var-get next-cascade-id)))
    (map-set cascades new-id
      {
        creator: tx-sender,
        graph-hash: graph-hash,
        name: name,
        node-count: node-count,
        edge-count: edge-count,
        created-at: block-height,
      }
    )
    (map-set cascade-states new-id
      {
        node-index: u0,
        root-deposit: u0,
        status: "registered",
      }
    )
    (var-set next-cascade-id (+ new-id u1))
    (ok new-id)
  )
)

;; Record a state witness for a node execution step.
;; Anyone can report a witness; the keeper verifies it off-chain.
(define-public (submit-witness
    (cascade-id uint)
    (node-index uint)
    (strategy-tx (buff 32))
    (deposit-tx (buff 32))
  )
  (begin
    (asserts! (is-some (map-get? cascades cascade-id)) ERR_NOT_FOUND)
    (map-set cascade-witnesses
      { cascade-id: cascade-id, node-index: node-index }
      {
        strategy-tx: strategy-tx,
        deposit-tx: deposit-tx,
        confirmed-at: block-height,
      }
    )
    (map-set cascade-states cascade-id
      (merge (default-to
        { node-index: u0, root-deposit: u0, status: "registered" }
        (map-get? cascade-states cascade-id))
        { node-index: (+ node-index u1), status: "executing" }
      )
    )
    (ok true)
  )
)

;; Mark a cascade as complete.
(define-public (complete-cascade (cascade-id uint))
  (begin
    (asserts! (is-some (map-get? cascades cascade-id)) ERR_NOT_FOUND)
    (map-set cascade-states cascade-id
      (merge (default-to
        { node-index: u0, root-deposit: u0, status: "registered" }
        (map-get? cascade-states cascade-id))
        { status: "completed" }
      )
    )
    (ok true)
  )
)

;; Register a composition link: this cascade feeds into another.
(define-public (register-composition
    (parent-cascade-id uint)
    (child-cascade-id uint)
  )
  (begin
    (asserts! (is-some (map-get? cascades parent-cascade-id)) ERR_NOT_FOUND)
    (asserts! (is-some (map-get? cascades child-cascade-id)) ERR_NOT_FOUND)
    (map-set composition-parents child-cascade-id (unwrap-panic (get creator (unwrap-panic (map-get? cascades parent-cascade-id)))))
    (ok true)
  )
)

(define-read-only (get-composition-parent (cascade-id uint))
  (map-get? composition-parents cascade-id)
)

;; Cascade Registry -- On-Chain Graph Storage
;;
;; Stores cascade graph definitions on-chain. Each published cascade
;; records its metadata (name, description, node/edge counts) and
;; the creator principal. Used by the Cascade frontend to discover
;; and load published money-flow graphs.
;;
;; Network: Stacks testnet
;; Depends on: SIP-010 trait (for potential future token-gating)

(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-INVALID-NAME (err u101))
(define-constant ERR-GRAPH-NOT-FOUND (err u102))
(define-constant MAX-NAME-LEN u64)
(define-constant MAX-DESC-LEN u256)

(define-data-var graph-counter uint u0)

(define-map graphs
  { graph-id: uint }
  {
    creator: principal,
    name: (string-ascii 64),
    description: (string-ascii 256),
    node-count: uint,
    edge-count: uint,
    created-at: uint
  }
)

(define-map creator-graph-index
  { creator: principal, idx: uint }
  { graph-id: uint }
)

(define-map creator-graph-count
  { creator: principal }
  { count: uint }
)

(define-read-only (get-graph-count)
  (ok (var-get graph-counter))
)

(define-read-only (get-graph (graph-id uint))
  (match (map-get? graphs { graph-id: graph-id })
    graph (ok graph)
    ERR-GRAPH-NOT-FOUND
  )
)

(define-read-only (get-graphs-by-creator (creator principal))
  (ok (default-to u0 (get count (map-get? creator-graph-count { creator: creator }))))
)

(define-read-only (get-graph-by-creator-index (creator principal) (idx uint))
  (match (map-get? creator-graph-index { creator: creator, idx: idx })
    entry (ok (get graph-id entry))
    ERR-GRAPH-NOT-FOUND
  )
)

(define-public (register-graph
    (name (string-ascii 64))
    (description (string-ascii 256))
    (node-count uint)
    (edge-count uint)
  )
  (begin
    (asserts! (> (len name) u0) ERR-INVALID-NAME)
    (asserts! (<= (len name) MAX-NAME-LEN) ERR-INVALID-NAME)

    (let ((next-id (+ (var-get graph-counter) u1))
          (creator-count (default-to u0 (get count (map-get? creator-graph-count { creator: tx-sender })))))
      (map-set graphs
        { graph-id: next-id }
        {
          creator: tx-sender,
          name: name,
          description: description,
          node-count: node-count,
          edge-count: edge-count,
          created-at: burn-block-height
        }
      )

      (map-set creator-graph-index
        { creator: tx-sender, idx: creator-count }
        { graph-id: next-id }
      )
      (map-set creator-graph-count
        { creator: tx-sender }
        { count: (+ creator-count u1) }
      )

      (var-set graph-counter next-id)
      (ok next-id)
    )
  )
)

(define-public (delete-graph (graph-id uint))
  (let ((graph (unwrap! (map-get? graphs { graph-id: graph-id }) ERR-GRAPH-NOT-FOUND)))
    (asserts! (is-eq (get creator graph) tx-sender) ERR-NOT-AUTHORIZED)
    (map-delete graphs { graph-id: graph-id })
    (ok true)
  )
)

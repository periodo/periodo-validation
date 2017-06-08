.results.bindings | group_by(.shape.value) | map({
    "shape": .[0].shape.value,
    "problems": (group_by(.message.value) | map({
        "message": .[0].message.value,
        "count": length,
        "uris": (map(.uri.value + ".json"))
    }))
})

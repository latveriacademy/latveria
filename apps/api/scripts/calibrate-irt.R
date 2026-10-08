# Offline psychometric calibration; never run inside the API request process.
args <- commandArgs(trailingOnly = TRUE)
if (length(args) != 3) stop("Usage: Rscript calibrate-irt.R dataset.json calibration.json version")
if (!requireNamespace("mirt", quietly = TRUE) || !requireNamespace("jsonlite", quietly = TRUE))
  stop("Install packages mirt and jsonlite before calibration.")
dataset <- jsonlite::fromJSON(args[1], simplifyVector = FALSE)
if (dataset$sampleSize < 200 || length(dataset$items) < 10) stop("Insufficient calibration data.")
responses <- do.call(rbind, lapply(dataset$rows, function(row)
  vapply(row$responses, function(x) if (is.null(x)) NA_real_ else as.numeric(x), numeric(1))))
if (any(!is.na(responses) & !(responses %in% c(0, 1)))) stop("2PL requires dichotomous responses.")
colnames(responses) <- paste0("item", seq_len(ncol(responses)))
set.seed(2026)
model <- mirt::mirt(responses, 1, itemtype = "2PL", SE = TRUE, verbose = FALSE,
                    technical = list(NCYCLES = 1000))
if (!mirt::extract.mirt(model, "converged")) stop("Model did not converge.")
parameters <- mirt::coef(model, IRTpars = TRUE, simplify = TRUE)$items
fit <- mirt::M2(model, type = "C2")
reliability <- as.numeric(mirt::marginal_rxx(model))[1]
rmsea <- as.numeric(fit$RMSEA)[1]
if (!is.finite(rmsea) || rmsea > .10 || !is.finite(reliability) || reliability < .60)
  stop("Model failed fit/reliability gates; review the items before activation.")
if (any(!is.finite(parameters[, "a"])) || any(parameters[, "a"] < .25 | parameters[, "a"] > 3) ||
    any(!is.finite(parameters[, "b"])) || any(abs(parameters[, "b"]) > 4))
  stop("Item parameters outside activation gates; review the items and recalibrate.")
artifact <- list(datasetId = dataset$datasetId, datasetHash = dataset$datasetHash, version = args[3],
                 model = "2PL", source = "mirt", sourceVersion = as.character(utils::packageVersion("mirt")),
                 parameters = lapply(seq_len(nrow(parameters)), function(i)
                   list(revisionId = dataset$items[[i]]$revisionId, a = parameters[i, "a"], b = parameters[i, "b"])),
                 diagnostics = list(converged = TRUE, rmsea = rmsea, reliability = reliability))
jsonlite::write_json(artifact, args[2], auto_unbox = TRUE, pretty = TRUE, digits = NA)
message("Calibration artifact created; review in admin before activation.")

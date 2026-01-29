fn main() {
  tauri_build::build();

  // Generate gRPC client stubs for device auth (see proto/device_auth.proto).
  println!("cargo:rerun-if-changed=proto/device_auth.proto");
  tonic_build::configure()
    .build_server(false)
    .compile(&["proto/device_auth.proto"], &["proto"])
    .expect("failed to compile gRPC protos");
}
